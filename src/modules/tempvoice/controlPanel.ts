import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonInteraction,
  ModalSubmitInteraction,
  GuildMember,
  ChannelType,
  VoiceChannel,
  TextChannel,
  PermissionFlagsBits
} from 'discord.js';
import { db } from '../../db/database';

export function buildControlPanelEmbed(ownerName: string, channelName: string, isLocked: boolean, isHidden: boolean, limit: number) {
  const embed = new EmbedBuilder()
    .setTitle(`🎙️ Curator Butler — Voice Control Panel`)
    .setDescription(
      `Welcome to your temporary voice channel, **${ownerName}**!\n\n` +
      `Use the quick control buttons below or slash commands to manage your channel.\n` +
      `*This channel will automatically be deleted when empty.*`
    )
    .addFields(
      { name: 'Channel Name', value: `\`${channelName}\``, inline: true },
      { name: 'User Limit', value: limit === 0 ? '`No Limit`' : `\`${limit} users\``, inline: true },
      { name: 'Status', value: `${isLocked ? '🔒 `Locked`' : '🔓 `Unlocked`'} | ${isHidden ? '👁️‍🗨️ `Hidden`' : '👁️ `Visible`'}`, inline: true }
    )
    .setColor(0x5865f2)
    .setFooter({ text: 'Curator Self-Hosted Butler Service' })
    .setTimestamp();

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('curator_temp_lock')
      .setLabel(isLocked ? 'Unlock' : 'Lock')
      .setEmoji(isLocked ? '🔓' : '🔒')
      .setStyle(isLocked ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('curator_temp_hide')
      .setLabel(isHidden ? 'Unhide' : 'Hide')
      .setEmoji(isHidden ? '👁️' : '👁️‍🗨️')
      .setStyle(isHidden ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('curator_temp_rename')
      .setLabel('Rename')
      .setEmoji('✏️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('curator_temp_limit')
      .setLabel('Limit')
      .setEmoji('👥')
      .setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('curator_temp_kick')
      .setLabel('Kick User')
      .setEmoji('🚫')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('curator_temp_claim')
      .setLabel('Claim Ownership')
      .setEmoji('👑')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('curator_temp_save_pref')
      .setLabel('Save Settings')
      .setEmoji('⚙️')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row1, row2] };
}

export async function handleButtonInteraction(interaction: ButtonInteraction) {
  const member = interaction.member as GuildMember;
  if (!member || !interaction.guild) return;

  // Find dynamic channel details
  const voiceState = member.voice;
  const currentVoiceId = voiceState.channelId;

  // Check if member is in a voice channel
  if (!currentVoiceId) {
    return interaction.reply({
      content: '❌ You must be in your temporary voice channel to use the control panel.',
      ephemeral: true
    });
  }

  const channelData = db.prepare(`SELECT * FROM temp_channels WHERE voice_id = ?`).get(currentVoiceId) as any;

  if (!channelData) {
    return interaction.reply({
      content: '❌ This voice channel is not managed by Curator.',
      ephemeral: true
    });
  }

  const voiceChannel = interaction.guild.channels.cache.get(currentVoiceId) as VoiceChannel;
  if (!voiceChannel) return;

  const isOwner = channelData.owner_id === member.id;

  // Claim ownership check
  if (interaction.customId === 'curator_temp_claim') {
    const ownerMember = interaction.guild.members.cache.get(channelData.owner_id);
    const ownerInChannel = ownerMember && ownerMember.voice.channelId === currentVoiceId;

    if (ownerInChannel) {
      return interaction.reply({
        content: `❌ Channel owner <@${channelData.owner_id}> is currently in the channel. You cannot claim ownership.`,
        ephemeral: true
      });
    }

    db.prepare(`UPDATE temp_channels SET owner_id = ? WHERE voice_id = ?`).run(member.id, currentVoiceId);
    return interaction.reply({
      content: `👑 You are now the owner of **${voiceChannel.name}**!`,
      ephemeral: false
    });
  }

  // Non-owners cannot alter channel settings
  if (!isOwner) {
    return interaction.reply({
      content: '❌ Only the channel owner can alter channel settings. (Click **Claim Ownership** if the owner left).',
      ephemeral: true
    });
  }

  // Lock / Unlock
  if (interaction.customId === 'curator_temp_lock') {
    const newLock = channelData.is_locked ? 0 : 1;
    await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      Connect: !newLock
    });
    db.prepare(`UPDATE temp_channels SET is_locked = ? WHERE voice_id = ?`).run(newLock, currentVoiceId);

    const updatedEmbed = buildControlPanelEmbed(
      member.displayName,
      voiceChannel.name,
      Boolean(newLock),
      Boolean(channelData.is_hidden),
      voiceChannel.userLimit
    );

    await interaction.update(updatedEmbed);
    return;
  }

  // Hide / Unhide
  if (interaction.customId === 'curator_temp_hide') {
    const newHide = channelData.is_hidden ? 0 : 1;
    await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      ViewChannel: !newHide
    });
    db.prepare(`UPDATE temp_channels SET is_hidden = ? WHERE voice_id = ?`).run(newHide, currentVoiceId);

    const updatedEmbed = buildControlPanelEmbed(
      member.displayName,
      voiceChannel.name,
      Boolean(channelData.is_locked),
      Boolean(newHide),
      voiceChannel.userLimit
    );

    await interaction.update(updatedEmbed);
    return;
  }

  // Rename Modal
  if (interaction.customId === 'curator_temp_rename') {
    const modal = new ModalBuilder()
      .setCustomId('curator_modal_rename')
      .setTitle('Rename Dynamic Channel');

    const nameInput = new TextInputBuilder()
      .setCustomId('new_name')
      .setLabel('New Channel Name')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(voiceChannel.name)
      .setMaxLength(32)
      .setRequired(true);

    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);
    modal.addComponents(row);
    await interaction.showModal(modal);
    return;
  }

  // Limit Modal
  if (interaction.customId === 'curator_temp_limit') {
    const modal = new ModalBuilder()
      .setCustomId('curator_modal_limit')
      .setTitle('Set Channel Capacity');

    const limitInput = new TextInputBuilder()
      .setCustomId('new_limit')
      .setLabel('User Limit (0 = Unlimited, Max = 99)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(String(voiceChannel.userLimit))
      .setMaxLength(2)
      .setRequired(true);

    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(limitInput);
    modal.addComponents(row);
    await interaction.showModal(modal);
    return;
  }

  // Kick Modal
  if (interaction.customId === 'curator_temp_kick') {
    const modal = new ModalBuilder()
      .setCustomId('curator_modal_kick')
      .setTitle('Kick User from Voice Channel');

    const userInput = new TextInputBuilder()
      .setCustomId('user_id_or_name')
      .setLabel('Username or User ID to kick')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Username or User ID')
      .setRequired(true);

    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(userInput);
    modal.addComponents(row);
    await interaction.showModal(modal);
    return;
  }

  // Save Settings as Default Preference
  if (interaction.customId === 'curator_temp_save_pref') {
    db.prepare(`
      INSERT INTO user_preferences (guild_id, user_id, preferred_name, preferred_limit, is_locked)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        preferred_name = excluded.preferred_name,
        preferred_limit = excluded.preferred_limit,
        is_locked = excluded.is_locked
    `).run(
      interaction.guild.id,
      member.id,
      voiceChannel.name.replace(member.displayName, '{user}'),
      voiceChannel.userLimit,
      channelData.is_locked
    );

    return interaction.reply({
      content: `⚙️ **Saved!** Curator will use name format \`${voiceChannel.name.replace(member.displayName, '{user}')}\` and capacity \`${voiceChannel.userLimit}\` next time you join a Master channel.`,
      ephemeral: true
    });
  }
}

export async function handleModalSubmit(interaction: ModalSubmitInteraction) {
  const member = interaction.member as GuildMember;
  if (!member || !interaction.guild) return;

  const currentVoiceId = member.voice.channelId;
  if (!currentVoiceId) return;

  const channelData = db.prepare(`SELECT * FROM temp_channels WHERE voice_id = ?`).get(currentVoiceId) as any;
  if (!channelData || channelData.owner_id !== member.id) return;

  const voiceChannel = interaction.guild.channels.cache.get(currentVoiceId) as VoiceChannel;
  if (!voiceChannel) return;

  if (interaction.customId === 'curator_modal_rename') {
    const newName = interaction.fields.getTextInputValue('new_name').trim();
    if (newName) {
      await voiceChannel.setName(newName);
      await interaction.reply({ content: `✏️ Renamed voice channel to **${newName}**!`, ephemeral: true });
    }
  }

  if (interaction.customId === 'curator_modal_limit') {
    const rawLimit = interaction.fields.getTextInputValue('new_limit').trim();
    const limit = parseInt(rawLimit, 10);
    if (!isNaN(limit) && limit >= 0 && limit <= 99) {
      await voiceChannel.setUserLimit(limit);
      await interaction.reply({ content: `👥 Set channel limit to **${limit === 0 ? 'Unlimited' : limit}**!`, ephemeral: true });
    } else {
      await interaction.reply({ content: '❌ Invalid limit. Please enter a number between 0 and 99.', ephemeral: true });
    }
  }

  if (interaction.customId === 'curator_modal_kick') {
    const targetQuery = interaction.fields.getTextInputValue('user_id_or_name').trim().toLowerCase();
    const targetMember = voiceChannel.members.find(
      (m) => m.id === targetQuery || m.user.username.toLowerCase().includes(targetQuery) || m.displayName.toLowerCase().includes(targetQuery)
    );

    if (!targetMember) {
      return interaction.reply({ content: '❌ Member not found in this voice channel.', ephemeral: true });
    }

    if (targetMember.id === member.id) {
      return interaction.reply({ content: '❌ You cannot kick yourself.', ephemeral: true });
    }

    await targetMember.voice.disconnect(`Kicked by channel owner ${member.displayName}`);
    // Revoke connect permissions for target member
    await voiceChannel.permissionOverwrites.edit(targetMember.id, { Connect: false });

    return interaction.reply({ content: `🚫 Kicked <@${targetMember.id}> from the channel and blocked reconnecting.`, ephemeral: true });
  }
}
