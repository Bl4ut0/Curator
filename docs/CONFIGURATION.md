# ⚙️ Curator — Configuration Guide

This document details all configuration options, environment variables, database schemas, naming placeholders, and customization settings available in **Curator**.

---

## 1. Environment Variables (`.env`)

| Variable | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `DISCORD_TOKEN` | String | **Yes** | None | Discord Bot token from Developer Portal |
| `CLIENT_ID` | String | **Yes** | None | Application Client ID from Developer Portal |
| `GUILD_ID` | String | No | Empty | Guild ID for instant slash command registration (Recommended during development) |
| `DATABASE_PATH` | String | No | `./data/curator.db` | File path for SQLite database file |
| `DEFAULT_PREFIX` | String | No | `!` | Legacy command prefix |
| `NODE_ENV` | String | No | `production` | Environment mode (`development` or `production`) |

---

## 2. Naming Placeholders (Dynamic Channel Templates)

When setting up Master Channels or saving user preferences, you can use dynamic placeholders in room name templates:

| Placeholder | Replaced With | Example Output |
| :--- | :--- | :--- |
| `{user}` | Server Nickname / Display Name | `Alice's Lounge` |
| `{username}` | Discord Handle | `alice_dev's Room` |
| `{game}` | Current Game / Rich Presence Activity | `🎮 Valorant [Alice]` |
| `{count}` | Current room member count | `Studio [1]` |
| `{number}` | Incremental room sequence number | `Room #1`, `Room #2` |

### Example Template Formats:
- `{user}'s Studio` -> `Bob's Studio`
- `🎮 {game} | {user}` -> `🎮 Overwatch 2 | Bob`
- `Squad #{number} [{count}]` -> `Squad #3 [1]`

---

## 3. Master Channel Parameters

When running `/master setup`, you can configure the following options:

- **`channel`** *(Required)*: The voice channel users click to spawn dynamic rooms.
- **`category`** *(Required)*: Target category where temporary voice & text rooms are created.
- **`default_name`** *(Optional)*: Naming template (Default: `{user}'s Room`).
- **`user_limit`** *(Optional)*: Default room user limit (0 - 99, where 0 = Unlimited).
- **`companion_text`** *(Optional)*: Automatically create a paired text chat for voice room members (Default: `true`).
- **`auto_lock`** *(Optional)*: Default new channels to locked state upon creation (Default: `false`).
- **`enable_waiting_room`** *(Optional)*: Create a dynamic `⌛ Waiting Room` for locked channels (Default: `true`).

---

## 4. Database Persistence Schema

Curator uses an embedded SQLite database (`curator.db`) in WAL mode.

- **`master_channels`**: Stores Master Join-to-Create channel configs per guild.
- **`temp_channels`**: Tracks active voice rooms, companion text IDs, owner IDs, lock/hide states.
- **`user_preferences`**: Remembers user room presets (name format, limit, lock state).
- **`user_voice_stats`**: Tracks total time spent in dynamic voice channels per user.
- **`reaction_roles`**: Button role panel configurations.
- **`guild_settings`**: Server audit log channel, admin role IDs, welcome messages.
