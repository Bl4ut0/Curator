import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  VoiceChannel
} from 'discord.js';

export const moveAllCommand = {
  data: new SlashCommandBuilder()
    .setName('moveall')
    .setDescription('Bulk move all members from one voice channel to another')
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
    .addChannelOption((opt) =>
      opt
        .setName('source')
        .setDescription('Voice channel to move members FROM')
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(true)
    )
    .addChannelOption((opt) =>
      opt
        .setName('target')
        .setDescription('Voice channel to move members TO')
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sourceChannel = interaction.options.getChannel('source') as VoiceChannel;
    const targetChannel = interaction.options.getChannel('target') as VoiceChannel;

    if (sourceChannel.id === targetChannel.id) {
      return interaction.reply({ content: '❌ Source and target voice channels cannot be the same.', ephemeral: true });
    }

    const members = Array.from(sourceChannel.members.values());

    if (members.length === 0) {
      return interaction.reply({ content: `ℹ️ No members currently in <#${sourceChannel.id}> to move.`, ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    let movedCount = 0;
    for (const member of members) {
      try {
        await member.voice.setChannel(targetChannel);
        movedCount++;
      } catch (err) {
        console.error(`[Curator MoveAll] Failed to move ${member.displayName}:`, err);
      }
    }

    return interaction.editReply({
      content: `🚚 Successfully moved **${movedCount}/${members.length}** member(s) from <#${sourceChannel.id}> to <#${targetChannel.id}>!`
    });
  }
};
