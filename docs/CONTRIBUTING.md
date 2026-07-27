# 🤝 Contributing to Curator

Thank you for your interest in contributing to **Curator**! Curator is an open-source, self-hosted Discord Butler Bot built to empower server owners with premium features without paywalls or voting restrictions.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20 or higher
- **npm**: v10 or higher
- **Discord Bot Token**: Create an app at the [Discord Developer Portal](https://discord.com/developers/applications)

### Local Development Setup

1. **Fork & Clone repository**:
   ```bash
   git clone https://github.com/Bl4ut0/Curator.git
   cd Curator
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Fill in `DISCORD_TOKEN`, `CLIENT_ID`, and `GUILD_ID` (for instant test server command registration).

4. **Run in Development Mode**:
   ```bash
   npm run dev
   ```

5. **Verify TypeScript Compilation**:
   ```bash
   npm run build
   ```

---

## 🎨 Design & Coding Guidelines

All contributions MUST adhere to the following standards:

1. **Follow the Design System**: Read [docs/DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) before designing any new slash command, embed, or button panel.
2. **Strict TypeScript Rules**: Maintain explicit typing. Do not introduce implicit `any` types.
3. **No Hidden Paywalls / Gating**: Curator is 100% free and open-source. All features must be fully accessible to any self-hosting user.
4. **Never Commit Secrets**: Ensure `.env`, local database files, or tokens are never committed. Verify `.gitignore` rules before opening a PR.

---

## 📝 Pull Request Checklist

Before submitting a Pull Request:
- [ ] Code compiles cleanly with zero TypeScript errors (`npm run build`).
- [ ] Feature adheres to [docs/DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).
- [ ] New slash commands include descriptive descriptions and permission checks.
- [ ] PR title follows conventional commit format (e.g. `feat: add voice queueing module`, `fix: handle empty channel cleanup edge case`).
