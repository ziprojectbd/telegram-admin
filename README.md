# Telegram Admin Panel

A modern, full-featured admin dashboard for managing Telegram bots with real-time inbox, post publishing, and settings.

## Tech Stack
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS + shadcn/ui**
- **MongoDB + Mongoose**
- **NextAuth.js v5**
- **Telegraf** (Telegram Bot)
- **UploadThing** (media uploads)
- **Server-Sent Events** (realtime inbox)

## Features
- Google login
- Dashboard overview
- Create & publish posts (with media)
- Real-time inbox with SSE
- Reply to chats directly
- Bot settings management
- Dark mode

## Quick Start

```bash
# 1. Clone & install
git clone <your-repo>
cd telegram-admin-panel
npm install

# 2. Add shadcn components (run once)
npx shadcn@latest add button card input textarea label switch avatar dropdown-menu separator

# 3. Setup environment
cp .env.example .env
# → Fill MONGODB_URI, TELEGRAM_BOT_TOKEN, etc.

# 4. Start MongoDB & run
npm run dev