# 🏗️ Curator System Architecture & Design Document

This document outlines the architectural design, module hierarchy, database schema, and event flow for the **Curator** Discord Butler Engine.

---

## 1. High-Level Architecture Overview

```
                      +-----------------------------+
                      |     Discord Gateway API     |
                      +--------------+--------------+
                                     |
                                     v
                      +--------------+--------------+
                      |    discord.js Client Engine |
                      +--------------+--------------+
                                     |
         +---------------------------+---------------------------+
         |                           |                           |
         v                           v                           v
+--------+--------+         +--------+--------+         +--------+--------+
| TempVoice Module|         | Announcement    |         | Moderation      |
| Engine          |         | Engine          |         | Module          |
+--------+--------+         +--------+--------+         +--------+--------+
         |                           |                           |
         +---------------------------+---------------------------+
                                     |
                                     v
                      +--------------+--------------+
                      |   SQLite Database (WAL Mode)|
                      +-----------------------------+
```

Curator is built as a single-process, asynchronous Node.js daemon using `discord.js` (v14) and an embedded SQLite database (`better-sqlite3`). It is designed for maximum speed, zero external microservice dependencies, and minimal memory consumption (<100MB RAM).

---

## 2. Component Breakdown

### A. Core Gateway & Event Dispatcher (`src/index.ts`)
- **Initialization**: Bootstraps the SQLite database, loads environment variables, and logs into the Discord Gateway.
- **REST Command Deployment**: Registers slash commands with Discord API on startup.
- **Event Router**: Routes incoming Gateway events (`voiceStateUpdate`, `interactionCreate`, `presenceUpdate`) to appropriate module handlers.

### B. Database Layer (`src/db/`)
- **Engine**: SQLite 3 with Write-Ahead Logging (`PRAGMA journal_mode = WAL`) enabled for high-performance concurrent reads and writes.
- **Tables**:
  - `master_channels`: Configured Master Join-to-Create voice channels.
  - `temp_channels`: Active dynamic voice channels, companion text IDs, owner IDs, waiting room IDs, lock/hide states.
  - `user_preferences`: Saved user defaults (preferred channel names, capacity, lock states).
  - `user_voice_stats`: User voice activity duration statistics.
  - `reaction_roles`: Button role panel configurations.
  - `guild_settings`: Guild-wide configuration (admin roles, audit log channels).

---

## 3. Database Entity Relationship Diagram (ERD)

```
[ master_channels ] 1 <--- * [ temp_channels ]
   - channel_id (PK)            - voice_id (PK)
   - category_id                - owner_id
   - default_name               - text_id
   - user_limit                 - waiting_room_id
   - create_companion_text      - master_id (FK)
   - auto_lock                  - is_locked

[ user_preferences ]            [ user_voice_stats ]
   - guild_id (PK)                 - guild_id (PK)
   - user_id (PK)                  - user_id (PK)
   - preferred_name                - total_seconds
   - preferred_limit               - last_joined_at
   - is_locked
```
