import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  VoiceChannel,
  CategoryChannel
} from 'discord.js';
import { db } from '../../db/database';

export const masterCommands = {
  data: new SlashCommandBuilder()
    .setName('master')
    .setDescription('Manage Curator Master Join-to-Create voice channels')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Designate a voice channel as a Master Join-to-Create channel')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('The voice channel users will join to trigger channel creation')
            .addChannelTypes(ChannelType.GuildVoice)
            .setRequired(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName('category')
            .setDescription('The category where temporary voice channels will be created')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('default_name')
            .setDescription('Default name template (Use {user} or {username})')
            .setRequired(false)
        )
        .addBooleanOption((opt) =>
          opt
            .setName('companion_text')
            .setDescription('Automatically create companion text chat for the voice room?')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('List all configured Master Join-to-Create channels')
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a Master channel configuration')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('The Master voice channel to remove')
            .addChannelTypes(ChannelType.GuildVoice)
            .setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    if (subcommand === 'setup') {
      const channel = interaction.options.getChannel('channel') as VoiceChannel;
      const category = interaction.options.getChannel('category') as CategoryChannel;
      const defaultName = interaction.options.getString('default_name') || "{user}'s Room";
      const companionText = interaction.options.getBoolean('companion_text') ?? true;

      db.prepare(`
        INSERT INTO master_channels (guild_id, channel_id, category_id, default_name, create_companion_text)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(channel_id) DO UPDATE SET
          category_id = excluded.category_id,
          default_name = excluded.default_name,
          create_companion_text = excluded.create_companion_text
      `).run(guildId, channel.id, category.id, defaultName, companionText ? 1 : 0);

      const embed = new EmbedBuilder()
        .setTitle('✅ Master Channel Configured')
        .setDescription(`Successfully designated <#${channel.id}> as a Master Join-to-Create channel!`)
        .addFields(
          { name: 'Master Channel', value: `<#${channel.id}>`, inline: true },
          { name: 'Target Category', value: `\`${category.name}\``, inline: true },
          { name: 'Default Naming', value: `\`${defaultName}\``, inline: true },
          { name: 'Companion Text', value: companionText ? '✅ Enabled' : '❌ Disabled', inline: true }
        )
        .setColor(0x57f287);

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'list') {
      const masters = db.prepare(`SELECT * FROM master_channels WHERE guild_id = ?`).all(guildId) as any[];

      if (masters.length === 0) {
        return interaction.reply({ content: 'ℹ️ No Master channels configured for this server yet. Use `/master setup` to create one!', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('🎙️ Configured Master Voice Channels')
        .setColor(0x5865f2);

      masters.forEach((m, idx) => {
        embed.addFields({
          name: `#${idx + 1} — Master Channel`,
          value: `Channel: <#${m.channel_id}>\nCategory: <#${m.category_id}>\nNaming: \`${m.default_name}\`\nCompanion Text: ${m.create_companion_text ? 'Yes' : 'No'}`
        });
      });

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'remove') {
      const channel = interaction.options.getChannel('channel') as VoiceChannel;
      const res = db.prepare(`DELETE FROM master_channels WHERE channel_id = ? AND guild_id = ?`).run(channel.id, guildId);

      if (res.changes > 0) {
        return interaction.reply({ content: `✅ Successfully removed master configuration for <#${channel.id}>.`, ephemeral: true });
      } else {
        return interaction.reply({ content: `❌ <#${channel.id}> was not configured as a Master channel.`, ephemeral: true });
      }
    }
  }
};
