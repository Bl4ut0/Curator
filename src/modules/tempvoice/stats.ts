import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { db } from '../../db/database';

export const leaderboardCommand = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Display server community leaderboards (Voice, Text, Code, Reputation)')
    .addStringOption((opt) =>
      opt
        .setName('category')
        .setDescription('Leaderboard metric')
        .addChoices(
          { name: '🎙️ Voice Activity Time', value: 'voice' },
          { name: '💬 Text Chat Messages', value: 'text' },
          { name: '💻 Code Snippets Shared', value: 'code' },
          { name: '⭐ Community Reputation / Helpers', value: 'rep' }
        )
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const category = interaction.options.getString('category')!;
    const guildId = interaction.guildId!;

    // 1. VOICE TIME LEADERBOARD
    if (category === 'voice') {
      const topVoice = db.prepare(`
        SELECT user_id, total_seconds FROM user_voice_stats
        WHERE guild_id = ?
        ORDER BY total_seconds DESC
        LIMIT 10
      `).all(guildId) as any[];

      if (topVoice.length === 0) {
        return interaction.reply({ content: 'ℹ️ No voice statistics recorded for this server yet.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('🎙️ Top Voice Activity Leaderboard')
        .setDescription('Top community members by time spent in dynamic voice rooms:')
        .setColor(0x5865f2);

      topVoice.forEach((u, idx) => {
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

    // 2. TEXT CHAT LEADERBOARD
    if (category === 'text') {
      const topText = db.prepare(`
        SELECT user_id, message_count FROM user_text_stats
        WHERE guild_id = ?
        ORDER BY message_count DESC
        LIMIT 10
      `).all(guildId) as any[];

      if (topText.length === 0) {
        return interaction.reply({ content: 'ℹ️ No text message statistics recorded yet.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('💬 Top Text Chatters Leaderboard')
        .setDescription('Top community members by message count:')
        .setColor(0x57f287);

      topText.forEach((u, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `\`#${idx + 1}\``;

        embed.addFields({
          name: `${medal} Member`,
          value: `<@${u.user_id}> — \`${u.message_count.toLocaleString()}\` messages`,
          inline: false
        });
      });

      return interaction.reply({ embeds: [embed] });
    }

    // 3. CODE SNIPPETS LEADERBOARD
    if (category === 'code') {
      const topCode = db.prepare(`
        SELECT user_id, code_block_count FROM user_text_stats
        WHERE guild_id = ? AND code_block_count > 0
        ORDER BY code_block_count DESC
        LIMIT 10
      `).all(guildId) as any[];

      if (topCode.length === 0) {
        return interaction.reply({ content: 'ℹ️ No code snippet blocks recorded yet. Share code using ``` triple backticks!', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('💻 Top Code Contributors Leaderboard')
        .setDescription('Top developers sharing code blocks in chat:')
        .setColor(0xfee75c);

      topCode.forEach((u, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `\`#${idx + 1}\``;

        embed.addFields({
          name: `${medal} Developer`,
          value: `<@${u.user_id}> — \`${u.code_block_count.toLocaleString()}\` code blocks shared`,
          inline: false
        });
      });

      return interaction.reply({ embeds: [embed] });
    }

    // 4. COMMUNITY REPUTATION LEADERBOARD
    if (category === 'rep') {
      const topRep = db.prepare(`
        SELECT user_id, rep_points, thanks_received FROM user_reputation
        WHERE guild_id = ? AND rep_points > 0
        ORDER BY rep_points DESC
        LIMIT 10
      `).all(guildId) as any[];

      if (topRep.length === 0) {
        return interaction.reply({ content: 'ℹ️ No community reputation points recorded yet. Use `/thank @user` to thank helpful members!', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('⭐ Community Helpers & Reputation Leaderboard')
        .setDescription('Top community members thanked for helping others:')
        .setColor(0xebf0f5);

      topRep.forEach((u, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `\`#${idx + 1}\``;

        embed.addFields({
          name: `${medal} Helper`,
          value: `<@${u.user_id}> — ⭐ **${u.rep_points}** Rep Points (\`${u.thanks_received}\` thanks)`,
          inline: false
        });
      });

      return interaction.reply({ embeds: [embed] });
    }
  }
};
