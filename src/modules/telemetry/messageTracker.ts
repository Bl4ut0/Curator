import { Message } from 'discord.js';
import { db } from '../../db/database';

export async function handleMessageCreate(message: Message) {
  if (!message.guild || message.author.bot) return;

  const guildId = message.guild.id;
  const userId = message.author.id;

  // Check if message contains code blocks (```)
  const containsCodeBlock = /```[\s\S]*?```/g.test(message.content) ? 1 : 0;

  try {
    db.prepare(`
      INSERT INTO user_text_stats (guild_id, user_id, message_count, code_block_count, last_message_at)
      VALUES (?, ?, 1, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        message_count = message_count + 1,
        code_block_count = code_block_count + excluded.code_block_count,
        last_message_at = CURRENT_TIMESTAMP
    `).run(guildId, userId, containsCodeBlock);
  } catch (err) {
    console.error('[Curator Telemetry] Error recording message stats:', err);
  }
}
