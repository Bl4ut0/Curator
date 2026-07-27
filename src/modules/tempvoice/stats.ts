import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { db } from '../../db/database';

export const statsCommand = {
  data: new SlashCommandBuilder()
    .setName('voicestats')
    .setDescription('View voice activity statistics and community leaderboards')
    .addSubcommand((sub) =>
      sub
        .setName('user')
        .setDescription('View your voice activity stats')
        .addUserOption((opt) =>
          opt
            .setName('target')
            .setDescription('Member to check stats for (Default: Yourself)')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('leaderboard')
        .setDescription('Display top voice active members in the server')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    if (subcommand === 'user') {
      const target = interaction.options.getUser('target') || interaction.user;
      const record = db.prepare(`SELECT * FROM user_voice_stats WHERE guild_id = ? AND user_id = ?`).get(guildId, target.id) as any;

      const totalSec = record ? record.total_seconds : 0;
      const hours = Math.floor(totalSec / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);

      const embed = new EmbedBuilder()
        .setTitle(`🎙️ Voice Statistics — ${target.username}`)
        .setThumbnail(target.displayAvatarURL())
        .addFields(
          { name: 'Total Time in Voice', value: `\`${hours}h ${minutes}m\``, inline: true },
          { name: 'Total Seconds', value: `\`${totalSec.toLocaleString()} seconds\``, inline: true },
          { name: 'Last Joined', value: record?.last_joined_at ? `<t:${Math.floor(new Date(record.last_joined_at).getTime() / 1000)}:R>` : '`Never`', inline: true }
        )
        .setColor(0x5865f2)
        .setFooter({ text: 'Curator Self-Hosted Voice Telemetry' });

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'leaderboard') {
      const topUsers = db.prepare(`
        SELECT user_id, total_seconds FROM user_voice_stats
        WHERE guild_id = ?
        ORDER BY total_seconds DESC
        LIMIT 10
      `).all(guildId) as any[];

      if (topUsers.length === 0) {
        return interaction.reply({ content: 'ℹ️ No voice statistics recorded for this server yet.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('🏆 Voice Activity Leaderboard')
        .setDescription('Top community members by voice time spent in dynamic channels:')
        .setColor(0xfee75c);

      topUsers.forEach((u, idx) => {
        const h = Math.floor(u.total_seconds / 3600);
        const m = Math.floor((u.total_seconds % 3600) / 60);
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `\`#${idx + 1}\``;

        embed.addFields({
          name: `${medal} Member`,
          value: `<@${u.user_id}> — \`${h}h ${m}m\` (${u.total_seconds.toLocaleString()}s)`,
          inline: false
        });
      });

      return interaction.reply({ embeds: [embed] });
    }
  }
};
