# 🎩 Curator — Self-Hosted All-in-One Discord Butler Bot

[![Docker Pulls](https://img.shields.io/docker/pulls/bl4ut0/curator?style=flat-square&color=5865F2)](https://hub.docker.com/r/bl4ut0/curator)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/Bl4ut0/Curator/docker-publish.yml?label=Docker%20Build&style=flat-square&color=57F287)](https://github.com/Bl4ut0/Curator/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**Curator** is an open-source, self-hosted Discord bot designed to provide premium features (dynamic voice channels, companion text chats, embed builders, button roles, and moderation utilities) **without paywalls, voting, or artificial limitations**.

---

## 🌟 Key Features

### 🎙️ Dynamic TempVoice Engine (TempVoice & ChannelBot Alternative)
- **Master "Join-to-Create" Channels**: Users join a designated Master Voice channel to trigger dynamic room creation.
- **Auto-Moving**: Bot creates the room with custom permissions and instantly moves the user.
- **Companion Text Chat**: Automatically provisions a private text chat tied directly to members inside the dynamic voice room.
- **Interactive Control Panel**: Persistent button interface posted inside the companion text chat:
  - 🔒 **Lock / Unlock**: Control `@everyone` connect access.
  - 👁️ **Hide / Unhide**: Toggle `@everyone` view permissions.
  - ✏️ **Rename**: Discord Modal for instant channel name edits.
  - 👥 **Capacity**: Set user limits (0 - 99).
  - 👑 **Claim / Transfer**: Transfer ownership or claim abandoned rooms.
  - 🚫 **Kick**: Disconnect and block annoying users.
  - ⚙️ **User Presets**: Remember preferred room names, capacities, and lock status across sessions.
- **Instant Cleanup**: Automatically deletes dynamic voice and text channels when empty.

### 📢 Butler Announcement & Reaction Role Engine
- `/embed send`: Interactive rich embed builder with custom colors, images, thumbnails, and markdown support.
- `/buttonrole create`: Unlimited button role panels (Dyno/Carl alternative with no limit caps).

### 🛠️ Moderation & Utilities
- `/moveall <source> <target>`: Mass move users between voice channels instantly.
- `/purge <amount> [filter]`: Selective message cleaner (filter by bots, users, links, files).

---

## 🚀 Quick Deployment (Docker Hub)

Curator is automatically built and published to Docker Hub as a multi-architecture image (`linux/amd64`, `linux/arm64`).

### 1. Download `docker-compose.yml`
```bash
mkdir curator && cd curator
curl -sSL https://raw.githubusercontent.com/Bl4ut0/Curator/main/docker-compose.yml -o docker-compose.yml
curl -sSL https://raw.githubusercontent.com/Bl4ut0/Curator/main/.env.example -o .env
```

### 2. Configure Credentials
Edit `.env` and fill in your Discord Bot credentials:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id
```

### 3. Launch
```bash
docker-compose up -d
```

> **🔄 Automatic Updates**: `docker-compose.yml` includes an optional **Watchtower** container service that automatically checks for new Docker Hub builds every 5 minutes and updates your running bot seamlessly.

---


## 💻 Local Development Setup

```bash
# Clone Repository
git clone https://github.com/Bl4ut0/Curator.git
cd Curator

# Install Dependencies
npm install

# Copy & Configure Environment
cp .env.example .env

# Run Development Server
npm run dev

# Build TypeScript Production Bundle
npm run build
```

---

## 🤖 Discord Developer Portal Setup

Enable the following **Privileged Gateway Intents** in the [Discord Developer Portal](https://discord.com/developers/applications):

1. **SERVER MEMBERS INTENT** (Enabled)
2. **MESSAGE CONTENT INTENT** (Enabled)

### Required Bot Permissions:
- `Manage Channels` (Create/Delete dynamic temp voice & companion text channels)
- `Move Members` (Move members into created voice channels)
- `Manage Roles` (Assign button roles)
- `Manage Messages` (Purge messages)
- `View Channels`, `Send Messages`, `Embed Links`

---

## 📚 Project Documentation

- [🎨 Design System & UX Standards](./DESIGN_SYSTEM.md)
- [🏗️ System Architecture & ERD](./ARCHITECTURE.md)
- [🤝 Contributing Guidelines](./CONTRIBUTING.md)

---

## 📄 License
Released under the **MIT License**. Free for personal and community self-hosting!
