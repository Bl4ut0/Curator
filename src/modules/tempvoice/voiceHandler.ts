import { VoiceState, ChannelType, PermissionFlagsBits, TextChannel, VoiceChannel } from 'discord.js';
import { db } from '../../db/database';
import { buildControlPanelEmbed } from './controlPanel';

export async function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
  const guild = newState.guild || oldState.guild;
  const member = newState.member || oldState.member;
  if (!guild || !member || member.user.bot) return;

  // -------------------------------------------------------------
  // 1. JOIN LOGIC (User joined a Master Channel)
  // -------------------------------------------------------------
  if (newState.channelId && newState.channelId !== oldState.channelId) {
    const masterConfig = db.prepare(`SELECT * FROM master_channels WHERE channel_id = ? AND guild_id = ?`).get(newState.channelId, guild.id) as any;

    if (masterConfig) {
      // Check user preferences
      const userPref = db.prepare(`SELECT * FROM user_preferences WHERE guild_id = ? AND user_id = ?`).get(guild.id, member.id) as any;

      // Determine channel name
      let rawName = userPref?.preferred_name || masterConfig.default_name || `{user}'s Channel`;
      const channelName = rawName.replace('{user}', member.displayName).replace('{username}', member.user.username);
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
          INSERT INTO temp_channels (voice_id, guild_id, owner_id, text_id, master_id, is_locked, is_hidden)
          VALUES (?, ?, ?, ?, ?, ?, 0)
        `).run(tempVoiceChannel.id, guild.id, member.id, companionTextId, newState.channelId, isLocked ? 1 : 0);

        // Move member to the new dynamic channel
        await newState.setChannel(tempVoiceChannel);

      } catch (err) {
        console.error('[Curator TempVoice] Error creating temp voice channel:', err);
      }
    }
  }

  // -------------------------------------------------------------
  // 2. MEMBER MOVEMENT LOGIC (Grant/Revoke Text Perms for Companion Text)
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
  // 3. LEAVE & CLEANUP LOGIC (Empty Temp Channel Auto-Deletion)
  // -------------------------------------------------------------
  if (oldState.channelId) {
    const tempChannelRecord = db.prepare(`SELECT * FROM temp_channels WHERE voice_id = ?`).get(oldState.channelId) as any;

    if (tempChannelRecord) {
      const voiceChannel = guild.channels.cache.get(oldState.channelId) as VoiceChannel;

      // If channel no longer exists or members count is 0
      if (!voiceChannel || voiceChannel.members.size === 0) {
        // Delete voice channel
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

        // Delete DB record
        db.prepare(`DELETE FROM temp_channels WHERE voice_id = ?`).run(oldState.channelId);
      }
    }
  }
}
