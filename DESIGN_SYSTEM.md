# 🎨 Curator Design System & UX Standards

This document establishes the official UI/UX design framework for the **Curator** Discord Butler Bot. All new modules, commands, embeds, and interactive components MUST adhere to these design standards to maintain a consistent, premium, and unified user experience.

---

## 1. Core Principles

1. **Butler Aesthetics**: Responses should feel refined, intelligent, helpful, and non-intrusive.
2. **Instant Feedback**: Every button click, modal submission, or slash command MUST provide immediate visual feedback (ephemeral status message or updated embed state).
3. **Clean Component Hierarchy**: Use Action Rows, Buttons, and Select Menus cleanly without cluttering the chat view.
4. **No Spam / Minimal Intrusion**: Avoid sending unprompted public messages. Control panels and error alerts default to **Ephemeral** responses unless public announcement is required.

---

## 2. Color Palette & Embed System

All Discord Embeds MUST use standardized color tokens defined below:

| Purpose / Context | Hex Color Code | Discord JS Token | Usage Example |
| :--- | :--- | :--- | :--- |
| **Brand Primary (Curator Blue)** | `#5865F2` | `0x5865F2` | Control panels, `/master list`, default embeds |
| **Success / Creation** | `#57F287` | `0x57F287` | Master setup success, role added, claim ownership |
| **Warning / Alert** | `#FEE75C` | `0xFEE75C` | Inactive warning, permission notice, non-fatal errors |
| **Danger / Removal** | `#ED4245` | `0xED4245` | Channel deletion, kick user, purge actions |
| **Info / Neutral** | `#EBF0F5` | `0xEBF0F5` | Help menus, system logs, stats displays |

---

## 3. Emoji & Typography Conventions

### Standardized Emojis

- 🎙️ **Voice Channels**: Voice master setup, dynamic rooms
- 💬 **Companion Text**: Text chat tied to dynamic voice
- 🔒 / 🔓 **Channel Locks**: Locked vs Unlocked state
- 👁️ / 👁️‍🗨️ **Channel Visibility**: Visible vs Hidden state
- ✏️ **Rename Action**: Modals for name changes
- 👥 **Capacity Limit**: User limit adjustments
- 👑 **Ownership**: Owner badge, claim ownership
- 🚫 **Kick / Reject**: Moderation kick actions
- ⚙️ **Settings / Presets**: Save defaults, configuration
- 🧹 **Purge Utility**: Bulk message cleaner
- 🚚 **Move All**: Mass voice member relocation

### Formatting Guidelines
- **Channel / User References**: Use Discord syntax `<#channel_id>`, `<@user_id>`, `<@&role_id>`.
- **Code Highlights**: Wrap technical terms, numbers, and command names in inline code blocks (e.g., \`/master setup\`, \`99 users\`).
- **Footer**: All public embeds MUST include the footer: `Curator Self-Hosted Butler Service`.

---

## 4. Button & Component Hierarchy

### TempVoice Control Panel Standard Layout

```
[ Row 1 ]: [🔒 Lock / 🔓 Unlock]  [👁️ Hide / 👁️‍🗨️ Unhide]  [✏️ Rename]  [👥 Limit]
[ Row 2 ]: [🚫 Kick User]         [👑 Claim Ownership]     [⚙️ Save Settings]
```

### Button Style Matrix

| Action Type | Button Style | Icon Convention |
| :--- | :--- | :--- |
| **Toggle On / Activate** | `ButtonStyle.Success` | Green emoji (`🔓`, `👁️`) |
| **Toggle Off / Restrict** | `ButtonStyle.Secondary` | Neutral emoji (`🔒`, `👁️‍🗨️`) |
| **Primary Input / Modal** | `ButtonStyle.Primary` | Edit emoji (`✏️`, `👥`) |
| **Destructive / Kick** | `ButtonStyle.Danger` | Red alert emoji (`🚫`) |
| **Administrative Claim** | `ButtonStyle.Secondary` | Crown emoji (`👑`) |

---

## 5. Code Architecture Standards

All module implementations MUST follow these file patterns:

```
src/modules/<module_name>/
├── commands.ts       # Slash command definitions & execution handlers
├── events.ts         # Discord Gateway event listeners (if applicable)
├── ui.ts             # Embed builders, button rows, & modal definitions
└── types.ts          # Module-specific TypeScript interfaces
```

### Code Formatting Rules
- **Strict Typing**: Zero `any` types wherever possible. Explicitly type Discord interactions (`ChatInputCommandInteraction`, `ButtonInteraction`, `ModalSubmitInteraction`).
- **Database Access**: Perform database queries using prepared statements (`db.prepare(...)`).
- **Error Handling**: Wrap interaction execution in `try / catch` blocks and provide user-friendly ephemeral error messages.
