import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  TextChannel,
  User
} from 'discord.js';

export const purgeCommand = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk clean messages with selective filters')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((opt) =>
      opt
        .setName('amount')
        .setDescription('Number of messages to inspect/delete (1 - 100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('filter')
        .setDescription('Filter type')
        .addChoices(
          { name: 'All Messages', value: 'all' },
          { name: 'Bot Messages Only', value: 'bots' },
          { name: 'User Messages Only (Exclude Bots)', value: 'users' },
          { name: 'Messages Containing Links', value: 'links' },
          { name: 'Messages With Attachments', value: 'files' }
        )
        .setRequired(false)
    )
    .addUserOption((opt) =>
      opt
        .setName('target_user')
        .setDescription('Delete messages from a specific user only')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const amount = interaction.options.getInteger('amount')!;
    const filter = interaction.options.getString('filter') || 'all';
    const targetUser = interaction.options.getUser('target_user');

    const channel = interaction.channel as TextChannel;
    if (!channel || !channel.isTextBased()) {
      return interaction.reply({ content: '❌ Purge can only be run in text channels.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const messages = await channel.messages.fetch({ limit: amount });

      const filtered = messages.filter((msg) => {
        // Filter by user
        if (targetUser && msg.author.id !== targetUser.id) return false;

        // Filter type
        if (filter === 'bots' && !msg.author.bot) return false;
        if (filter === 'users' && msg.author.bot) return false;
        if (filter === 'links' && !/(https?:\/\/[^\s]+)/gi.test(msg.content)) return false;
        if (filter === 'files' && msg.attachments.size === 0) return false;

        return true;
      });

      if (filtered.size === 0) {
        return interaction.editReply({ content: 'ℹ️ No messages matched your filter criteria.' });
      }

      const deleted = await channel.bulkDelete(filtered, true);

      return interaction.editReply({
        content: `🧹 Successfully purged **${deleted.size}** message(s) ${targetUser ? `from <@${targetUser.id}>` : ''} (Filter: \`${filter}\`).`
      });

    } catch (err) {
      console.error('[Curator Purge] Error purging messages:', err);
      return interaction.editReply({ content: '❌ Failed to purge messages. Note: Discord does not permit bulk deletion of messages older than 14 days.' });
    }
  }
};
