import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember
} from 'discord.js';
import { db } from '../../db/database';

export const thankCommand = {
  data: new SlashCommandBuilder()
    .setName('thank')
    .setDescription('Thank a community member for helping you with code or questions')
    .addUserOption((opt) =>
      opt
        .setName('member')
        .setDescription('The member you want to thank')
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('reason')
        .setDescription('Reason for thanking them (e.g. helped debug React component)')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('member')!;
    const reason = interaction.options.getString('reason') || 'Helping out in the community';
    const giverId = interaction.user.id;
    const guildId = interaction.guildId!;

    if (targetUser.id === giverId) {
      return interaction.reply({ content: '❌ You cannot thank yourself!', ephemeral: true });
    }

    if (targetUser.bot) {
      return interaction.reply({ content: '❌ Bots appreciate your gratitude, but cannot earn reputation points!', ephemeral: true });
    }

    // Cooldown Check: Can only thank the same user once every 6 hours
    const recentThank = db.prepare(`
      SELECT * FROM reputation_logs
      WHERE guild_id = ? AND giver_id = ? AND receiver_id = ? AND created_at > datetime('now', '-6 hours')
    `).get(guildId, giverId, targetUser.id);

    if (recentThank) {
      return interaction.reply({
        content: `⏱️ You recently thanked <@${targetUser.id}>. You can thank them again later!`,
        ephemeral: true
      });
    }

    // Record reputation log
    db.prepare(`
      INSERT INTO reputation_logs (guild_id, giver_id, receiver_id, reason)
      VALUES (?, ?, ?, ?)
    `).run(guildId, giverId, targetUser.id, reason);

    // Update target user's reputation points
    db.prepare(`
      INSERT INTO user_reputation (guild_id, user_id, rep_points, thanks_received)
      VALUES (?, ?, 1, 1)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        rep_points = rep_points + 1,
        thanks_received = thanks_received + 1
    `).run(guildId, targetUser.id);

    const updatedRep = db.prepare(`SELECT rep_points FROM user_reputation WHERE guild_id = ? AND user_id = ?`).get(guildId, targetUser.id) as any;

    const embed = new EmbedBuilder()
      .setTitle('🌟 Community Reputation Granted!')
      .setDescription(`**<@${giverId}>** thanked **<@${targetUser.id}>**!`)
      .addFields(
        { name: 'Reason', value: `\`${reason}\``, inline: false },
        { name: 'Total Reputation', value: `⭐ **${updatedRep.rep_points}** Rep Points`, inline: true }
      )
      .setColor(0x57f287)
      .setFooter({ text: 'Curator Community Reputation System' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};

export const repCheckCommand = {
  data: new SlashCommandBuilder()
    .setName('reputation')
    .setDescription('Check community reputation points and helper rank')
    .addUserOption((opt) =>
      opt
        .setName('member')
        .setDescription('Target member (Default: Yourself)')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('member') || interaction.user;
    const guildId = interaction.guildId!;

    const repRecord = db.prepare(`SELECT * FROM user_reputation WHERE guild_id = ? AND user_id = ?`).get(guildId, targetUser.id) as any;
    const textRecord = db.prepare(`SELECT * FROM user_text_stats WHERE guild_id = ? AND user_id = ?`).get(guildId, targetUser.id) as any;

    const repPoints = repRecord ? repRecord.rep_points : 0;
    const thanksCount = repRecord ? repRecord.thanks_received : 0;
    const codeBlocks = textRecord ? textRecord.code_block_count : 0;

    let badge = '🌱 Newbie Contributor';
    if (repPoints >= 50) badge = '👑 Legendary Mentor';
    else if (repPoints >= 25) badge = '💎 Master Helper';
    else if (repPoints >= 10) badge = '⭐ Senior Helper';
    else if (repPoints >= 3) badge = '🛠️ Active Helper';

    const embed = new EmbedBuilder()
      .setTitle(`⭐ Reputation Profile — ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: 'Helper Rank', value: `**${badge}**`, inline: true },
        { name: 'Reputation Points', value: `⭐ **${repPoints}**`, inline: true },
        { name: 'Times Thanked', value: `👏 **${thanksCount}** times`, inline: true },
        { name: 'Code Snippets Shared', value: `💻 **${codeBlocks}** blocks`, inline: true }
      )
      .setColor(0x5865f2)
      .setFooter({ text: 'Curator DevHub Telemetry' });

    return interaction.reply({ embeds: [embed] });
  }
};
