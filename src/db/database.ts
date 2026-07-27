import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH || './data/curator.db';

// Ensure data directory exists
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db = new Database(dbPath);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS master_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL UNIQUE,
      category_id TEXT NOT NULL,
      default_name TEXT DEFAULT '{user}''s Room',
      user_limit INTEGER DEFAULT 0,
      create_companion_text INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS temp_channels (
      voice_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      text_id TEXT,
      master_id TEXT NOT NULL,
      is_locked INTEGER DEFAULT 0,
      is_hidden INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      preferred_name TEXT,
      preferred_limit INTEGER,
      is_locked INTEGER DEFAULT 0,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS reaction_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      custom_id TEXT NOT NULL UNIQUE,
      role_id TEXT NOT NULL,
      emoji TEXT,
      label TEXT
    );

    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      admin_role_id TEXT,
      audit_log_channel_id TEXT,
      welcome_channel_id TEXT,
      welcome_message TEXT,
      auto_role_id TEXT
    );
  `);

  console.log('[Curator DB] Database initialized successfully.');
}
