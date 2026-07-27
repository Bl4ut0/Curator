# 📖 Curator — Complete Functionality & Feature Guide

This guide details all available features, slash commands, interactive control panel buttons, companion text features, moderation tools, and advanced TempVoice capabilities implemented in **Curator**.

---

## 🎙️ 1. TempVoice & Companion Text Engine

### Dynamic Room Lifecycle
1. **Join-to-Create**: Member joins a registered Master Voice Channel (`➕ Join to Create`).
2. **Room Generation**: Curator reads user preferences (or master defaults) and spawns a dynamic voice channel under the designated category.
3. **Automatic Move**: Curator moves the member into their newly spawned room in milliseconds.
4. **Companion Text Chat**: Curator opens a paired text channel visible only to members inside the dynamic voice room.
5. **Control Panel Embed**: Curator posts an interactive Control Panel embed into the companion text chat.
6. **Auto Cleanup**: When all members leave the voice room, Curator automatically deletes the voice room and companion text chat.

---

## 🎛️ 2. Interactive Control Panel Interface

Inside the companion text chat, channel owners have an interactive Button & Modal control panel:

```
[ Row 1 ]: [🔒 Lock / 🔓 Unlock]  [👁️ Hide / 👁️‍🗨️ Unhide]  [✏️ Rename]  [👥 Limit]
[ Row 2 ]: [🚫 Kick User]         [👑 Claim Ownership]     [⚙️ Save Settings]
```

### Button Functions:
- **🔒 Lock / 🔓 Unlock**: Toggles `@everyone` connect access. When locked, only invited members can join.
- **👁️ Hide / 👁️‍🗨️ Unhide**: Toggles `@everyone` view access. When hidden, the room becomes invisible on the channel list.
- **✏️ Rename**: Opens a Discord Modal allowing the room owner to update the channel name instantly.
- **👥 Limit**: Opens a Discord Modal allowing the room owner to set room capacity (0 - 99 users).
- **🚫 Kick User**: Opens a Discord Modal allowing the room owner to disconnect a user and revoke their connect permission.
- **👑 Claim Ownership**: Allows any member inside an active room to claim ownership if the original owner leaves.
- **⚙️ Save Settings**: Saves the current room name format, limit, and lock state to SQLite as the owner's default preset for future room creations.

---

## ⏳ 3. Voice Waiting Room & Host Knocking System

When a room owner **Locks** their dynamic voice channel:
1. Curator automatically spawns an optional **`⌛ Waiting Room`** channel right below the locked room.
2. When a guest joins `⌛ Waiting Room`, Curator sends an interactive alert to the room owner in the companion text chat:
   ```
   🔔 Guest <@GuestUser> wants to join your locked room "Alice's Studio"!
   [ ✅ Allow & Move ]   [ ❌ Reject ]
   ```
3. Clicking **✅ Allow & Move** grants the guest permission and moves them directly into the locked voice room!

---

## 📢 4. Announcement & Button Role Engine

### Embed Builder (`/embed send`)
Create rich, customized embed announcements with:
- Target channel selection
- Title, body description (with markdown & `\n` support)
- Custom Hex colors (e.g. `#5865F2`)
- Main image URL & top-right thumbnail URL
- Custom footer text

### Unlimited Button Roles (`/buttonrole create`)
Create self-service role assignment panels without Dyno/Carl paywalls:
- Target channel & role selection
- Custom button label, emoji, and style (Blue, Green, Gray, Red)
- Clicking toggles the role on/off instantly with ephemeral status notifications.

---

## 🛠️ 5. Butler Moderation & Utilities

### Mass Move (`/moveall`)
- Relocate all members from a source voice channel to a target voice channel in one command.

### Selective Purge (`/purge`)
- Bulk delete up to 100 messages with selective filters:
  - `all`: Delete all messages
  - `bots`: Delete bot messages only
  - `users`: Exclude bot messages
  - `links`: Delete messages containing URLs
  - `files`: Delete messages containing attachments
  - `target_user`: Filter by specific user
