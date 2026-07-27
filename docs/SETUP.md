# 🚀 Curator — Complete Setup & Deployment Guide

This guide provides step-by-step instructions for creating your Discord Bot Application, setting up required permissions, configuring Curator, and deploying it using Docker or Node.js.

---

## Table of Contents
1. [Discord Developer Portal Setup](#1-discord-developer-portal-setup)
2. [Prerequisites](#2-prerequisites)
3. [Docker Deployment (Recommended)](#3-docker-deployment-recommended)
4. [Manual Node.js Setup](#4-manual-nodejs-setup)
5. [First-Time Server Configuration](#5-first-time-server-configuration)

---

## 1. Discord Developer Portal Setup

To run Curator, you must register a Discord Bot Application:

### Step 1: Create an Application
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** in the top right.
3. Name your bot (e.g., `Curator Butler`) and click **Create**.

### Step 2: Enable Privileged Gateway Intents
1. In your Application menu, click **Bot** in the left sidebar.
2. Scroll down to **Privileged Gateway Intents**.
3. Enable the following toggles:
   - ✅ **SERVER MEMBERS INTENT**
   - ✅ **MESSAGE CONTENT INTENT**
4. Click **Save Changes**.

### Step 3: Copy Bot Token & Client ID
1. On the **Bot** page, click **Reset Token** to copy your bot token. *(Store this safely—you will paste it into your `.env` file).*
2. Go to **OAuth2** -> **General** in the left sidebar, and copy your **Client ID**.

### Step 4: Invite Bot to Your Discord Server
1. Go to **OAuth2** -> **URL Generator**.
2. Under **Scopes**, select `bot` and `applications.commands`.
3. Under **Bot Permissions**, select:
   - `Manage Channels`
   - `Manage Roles`
   - `Manage Messages`
   - `Move Members`
   - `Mute Members`
   - `Deafen Members`
   - `View Channels`
   - `Send Messages`
   - `Embed Links`
   - `Attach Files`
   - `Read Message History`
4. Copy the generated URL at the bottom and open it in your browser to invite Curator to your server.

---

## 2. Prerequisites

- **Docker & Docker Compose** (Recommended for quick deployment), OR
- **Node.js v20+** and **npm v10+** (For running directly on host OS).

---

## 3. Docker Deployment (Recommended)

### Step 1: Clone Repository
```bash
git clone https://github.com/Bl4ut0/Curator.git
cd Curator
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` in any text editor and fill in your values:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_discord_server_id
DATABASE_PATH=./data/curator.db
```

### Step 3: Start Container
```bash
docker-compose up -d --build
```
To view live logs:
```bash
docker-compose logs -f
```

---

## 4. Manual Node.js Setup

If you prefer running without Docker:

```bash
# Install dependencies
npm install

# Copy configuration
cp .env.example .env

# Build TypeScript code
npm run build

# Start bot
npm start
```

For active development with auto-reload:
```bash
npm run dev
```

---

## 5. First-Time Server Configuration

Once Curator is online in your server:

1. Create a Voice Channel named `➕ Join to Create`.
2. Create a Category named `🎙️ Temp Rooms`.
3. Run the slash command in your server:
   ```
   /master setup channel:#Join-to-Create category:🎙️ Temp Rooms default_name:{user}'s Lounge companion_text:true
   ```
4. Join the `➕ Join to Create` voice channel! Curator will automatically create your private room, companion text chat, and move you inside.
