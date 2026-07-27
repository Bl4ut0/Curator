import { VoiceState, ChannelType, PermissionFlagsBits, TextChannel, VoiceChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ActivityType } from 'discord.js';
import { db } from '../../db/database';
import { buildControlPanelEmbed } from './controlPanel';

// Active voice session start timestamps map: `${guildId}_${userId}` -> timestamp
const voiceSessionStart = new Map<string, number>();

export async function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
  const guild = newState.guild || oldState.guild;
  const member = newState.member || oldState.member;
  if (!guild || !member || member.user.bot) return;

  const sessionKey = `${guild.id}_${member.id}`;

  // Track session start
  if (newState.channelId && !oldState.channelId) {
    voiceSessionStart.set(sessionKey, Date.now());
  }

  // Track session end & accumulate stats
  if (oldState.channelId && !newState.channelId) {
    const startTime = voiceSessionStart.get(sessionKey);
    if (startTime) {
      const durationSec = Math.floor((Date.now() - startTime) / 1000);
      voiceSessionStart.delete(sessionKey);

      if (durationSec > 0) {
        db.prepare(`
          INSERT INTO user_voice_stats (guild_id, user_id, total_seconds, last_joined_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(guild_id, user_id) DO UPDATE SET
            total_seconds = total_seconds + excluded.total_seconds,
            last_joined_at = CURRENT_TIMESTAMP
        `).run(guild.id, member.id, durationSec);
      }
    }
  }

  // -------------------------------------------------------------
  // 1. JOIN LOGIC (User joined a Master Channel)
  // -------------------------------------------------------------
  if (newState.channelId && newState.channelId !== oldState.channelId) {
    const masterConfig = db.prepare(`SELECT * FROM master_channels WHERE channel_id = ? AND guild_id = ?`).get(newState.channelId, guild.id) as any;

    if (masterConfig) {
      const userPref = db.prepare(`SELECT * FROM user_preferences WHERE guild_id = ? AND user_id = ?`).get(guild.id, member.id) as any;

      // Extract Game Activity if available
      let gameName = 'General';
      const mainActivity = member.presence?.activities.find((a) => a.type === ActivityType.Playing || a.type === ActivityType.Streaming);
      if (mainActivity) {
        gameName = mainActivity.name;
      }

      // Count existing temp channels for room sequence number
      const existingCount = (db.prepare(`SELECT COUNT(*) as count FROM temp_channels WHERE guild_id = ?`).get(guild.id) as any).count;
      const roomNum = existingCount + 1;

      // Determine channel name with rich placeholders
      let rawName = userPref?.preferred_name || masterConfig.default_name || `{user}'s Channel`;
      const channelName = rawName
        .replace('{user}', member.displayName)
        .replace('{username}', member.user.username)
        .replace('{game}', gameName)
        .replace('{count}', '1')
        .replace('{number}', String(roomNum));

      const userLimit = userPref?.preferred_limit ?? masterConfig.user_limit ?? 0;
      const isLocked = userPref ? Boolean(userPref.is_locked) : false;

      try {
        // Create dynamic Voice Channel under master category
        const tempVoiceChannel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildVoice,
          parent: masterConfig.category_id,
          userLimit: userLimit,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              allow: [PermissionFlagsBits.ViewChannel],
              deny: isLocked ? [PermissionFlagsBits.Connect] : []
            },
            {
              id: member.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.Connect,
                PermissionFlagsBits.Speak,
                PermissionFlagsBits.MoveMembers,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.MuteMembers,
                PermissionFlagsBits.DeafenMembers
              ]
            }
          ]
        });

        let companionTextId: string | null = null;
        let waitingRoomId: string | null = null;

        // Create optional Waiting Room if channel is created locked
        if (isLocked && masterConfig.enable_waiting_room) {
          const waitingChannel = await guild.channels.create({
            name: `⌛ Waiting Room (${member.displayName})`,
            type: ChannelType.GuildVoice,
            parent: masterConfig.category_id,
            permissionOverwrites: [
              {
                id: guild.roles.everyone.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
              }
            ]
          });
          waitingRoomId = waitingChannel.id;
        }

        // Create companion text channel if enabled
        if (masterConfig.create_companion_text) {
          const textChannel = await guild.channels.create({
            name: `💬-${channelName.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`,
            type: ChannelType.GuildText,
            parent: masterConfig.category_id,
            permissionOverwrites: [
              {
                id: guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel]
              },
              {
                id: member.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
              }
            ]
          });

          companionTextId = textChannel.id;

          // Send Control Panel Embed into companion text channel
          const panelPayload = buildControlPanelEmbed(
            member.displayName,
            tempVoiceChannel.name,
            isLocked,
            false,
            userLimit
          );
          await textChannel.send({
            content: `👋 <@${member.id}>, welcome to your private Butler control chat!`,
            ...panelPayload
          });
        }

        // Insert into DB
        db.prepare(`
          INSERT INTO temp_channels (voice_id, guild_id, owner_id, text_id, waiting_room_id, master_id, is_locked, is_hidden)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        `).run(tempVoiceChannel.id, guild.id, member.id, companionTextId, waitingRoomId, newState.channelId, isLocked ? 1 : 0);

        // Move member to the new dynamic channel
        await newState.setChannel(tempVoiceChannel);

      } catch (err) {
        console.error('[Curator TempVoice] Error creating temp voice channel:', err);
      }
    }
  }

  // -------------------------------------------------------------
  // 2. WAITING ROOM KNOCKING DETECTOR
  // -------------------------------------------------------------
  if (newState.channelId && newState.channelId !== oldState.channelId) {
    const tempChannelWithWaiting = db.prepare(`SELECT * FROM temp_channels WHERE waiting_room_id = ?`).get(newState.channelId) as any;

    if (tempChannelWithWaiting && tempChannelWithWaiting.text_id && member.id !== tempChannelWithWaiting.owner_id) {
      const companionText = guild.channels.cache.get(tempChannelWithWaiting.text_id) as TextChannel;
      if (companionText) {
        const knockEmbed = new EmbedBuilder()
          .setTitle('🔔 Guest Knocking at Waiting Room!')
          .setDescription(`Guest <@${member.id}> (\`${member.displayName}\`) is waiting in the Waiting Room to join your room.`)
          .setColor(0xfee75c);

        const allowBtn = new ButtonBuilder()
          .setCustomId(`curator_waiting_allow_${tempChannelWithWaiting.voice_id}_${member.id}`)
          .setLabel('Allow & Move')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success);

        const rejectBtn = new ButtonBuilder()
          .setCustomId(`curator_waiting_reject_${member.id}`)
          .setLabel('Reject')
          .setEmoji('❌')
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(allowBtn, rejectBtn);

        await companionText.send({
          content: `<@${tempChannelWithWaiting.owner_id}>, someone is knocking at your door!`,
          embeds: [knockEmbed],
          components: [row]
        });
      }
    }
  }

  // -------------------------------------------------------------
  // 3. MEMBER MOVEMENT LOGIC (Grant/Revoke Text Perms for Companion Text)
  // -------------------------------------------------------------
  if (newState.channelId && newState.channelId !== oldState.channelId) {
    const tempChannel = db.prepare(`SELECT * FROM temp_channels WHERE voice_id = ?`).get(newState.channelId) as any;
    if (tempChannel && tempChannel.text_id) {
      const textChannel = guild.channels.cache.get(tempChannel.text_id) as TextChannel;
      if (textChannel) {
        await textChannel.permissionOverwrites.edit(member.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        });
      }
    }
  }

  if (oldState.channelId && oldState.channelId !== newState.channelId) {
    const tempChannel = db.prepare(`SELECT * FROM temp_channels WHERE voice_id = ?`).get(oldState.channelId) as any;
    if (tempChannel && tempChannel.text_id && tempChannel.owner_id !== member.id) {
      const textChannel = guild.channels.cache.get(tempChannel.text_id) as TextChannel;
      if (textChannel) {
        await textChannel.permissionOverwrites.delete(member.id);
      }
    }
  }

  // -------------------------------------------------------------
  // 4. LEAVE & CLEANUP LOGIC (Empty Temp Channel Auto-Deletion)
  // -------------------------------------------------------------
  if (oldState.channelId) {
    const tempChannelRecord = db.prepare(`SELECT * FROM temp_channels WHERE voice_id = ?`).get(oldState.channelId) as any;

    if (tempChannelRecord) {
      const voiceChannel = guild.channels.cache.get(oldState.channelId) as VoiceChannel;

      // If channel no longer exists or members count is 0
      if (!voiceChannel || voiceChannel.members.size === 0) {
        if (voiceChannel) {
          await voiceChannel.delete('Curator: Temporary channel empty').catch(() => {});
        }

        // Delete companion text channel if exists
        if (tempChannelRecord.text_id) {
          const textChannel = guild.channels.cache.get(tempChannelRecord.text_id);
          if (textChannel) {
            await textChannel.delete('Curator: Companion text channel empty cleanup').catch(() => {});
          }
        }

        // Delete waiting room channel if exists
        if (tempChannelRecord.waiting_room_id) {
          const waitingChannel = guild.channels.cache.get(tempChannelRecord.waiting_room_id);
          if (waitingChannel) {
            await waitingChannel.delete('Curator: Waiting room cleanup').catch(() => {});
          }
        }

        // Delete DB record
        db.prepare(`DELETE FROM temp_channels WHERE voice_id = ?`).run(oldState.channelId);
      }
    }
  }
}
