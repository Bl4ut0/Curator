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
- **Event Router**: Routes incoming Gateway events (`voiceStateUpdate`, `interactionCreate`) to appropriate module handlers.

### B. Database Layer (`src/db/`)
- **Engine**: SQLite 3 with Write-Ahead Logging (`PRAGMA journal_mode = WAL`) enabled for high-performance concurrent reads and writes.
- **Tables**:
  - `master_channels`: Configured Master Join-to-Create voice channels.
  - `temp_channels`: Active dynamic voice channels and paired text channels.
  - `user_preferences`: Saved user defaults (preferred channel names, capacity, lock states).
  - `reaction_roles`: Button role panel configurations.
  - `guild_settings`: Guild-wide configuration (admin roles, audit log channels).

### C. TempVoice & Companion Text Module (`src/modules/tempvoice/`)
1. **Join Detector (`voiceHandler.ts`)**:
   - Intercepts `voiceStateUpdate`.
   - Compares joined voice channel against `master_channels` DB records.
2. **Channel Provisioner**:
   - Creates dynamic voice channel under target category.
   - Applies permission overwrites for owner and `@everyone`.
   - Optionally creates paired text channel.
   - Moves member to new room.
3. **Control Panel (`controlPanel.ts`)**:
   - Posts interactive Embed with Action Buttons.
   - Handles button toggles (`Lock`, `Hide`, `Claim`, `Save Preferences`).
   - Handles Modals (`Rename`, `Limit`, `Kick`).
4. **Auto Cleanup**:
   - Detects when dynamic channel member count reaches `0`.
   - Deletes voice room, companion text room, and removes database record.

### D. Announcement & Role Engine (`src/modules/announcements/`)
- **Embed Builder (`embedBuilder.ts`)**: Custom rich embed generator.
- **Button Roles (`reactionRoles.ts`)**: Self-service button role panels with instant role toggling.

### E. Moderation Engine (`src/modules/moderation/`)
- **Purge (`purge.ts`)**: Selective message bulk deletion.
- **MoveAll (`moveall.ts`)**: Mass voice relocation utility.

---

## 3. Database Entity Relationship Diagram (ERD)

```
[ master_channels ] 1 <--- * [ temp_channels ]
   - channel_id (PK)            - voice_id (PK)
   - category_id                - owner_id
   - default_name               - text_id
   - user_limit                 - master_id (FK)
   - create_companion_text      - is_locked

[ user_preferences ]            [ reaction_roles ]
   - guild_id (PK)                 - id (PK)
   - user_id (PK)                  - custom_id (Unique)
   - preferred_name                - role_id
   - preferred_limit               - message_id
   - is_locked                     - channel_id
```

---

## 4. Container Deployment & Multi-Arch Support

Curator is built for containerized deployment using Docker:
- **Base Image**: `node:20-alpine` (Minimal footprint, ~120MB).
- **Multi-Arch**: Multi-architecture Docker builds (`linux/amd64` for x86 servers, `linux/arm64` for Raspberry Pi / ARM cloud instances).
- **Volume Mount**: `/app/data` is mounted to persist SQLite database across container upgrades.
