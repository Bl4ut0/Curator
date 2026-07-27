import dotenv from 'dotenv';
dotenv.config();

export const config = {
  token: process.env.DISCORD_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  guildId: process.env.GUILD_ID || '',
  dbPath: process.env.DATABASE_PATH || './data/curator.db',
  defaultPrefix: process.env.DEFAULT_PREFIX || '!',
};

if (!config.token) {
  console.warn('[Curator Config] WARNING: DISCORD_TOKEN is missing in environment variables.');
}
