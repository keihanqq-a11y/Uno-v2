# UNO Premium

Production-quality multiplayer UNO built with Next.js, TypeScript, Tailwind CSS, Socket.IO, Prisma, PostgreSQL, and Redis.

## Stack

- **Next.js 15** (App Router) + custom Node server for Socket.IO
- **Prisma** + PostgreSQL
- **Redis** matchmaking queues
- **Server-authoritative** UNO engine with Vitest coverage

## Quick start

```bash
# Ensure PostgreSQL and Redis are running
cp .env.example .env

npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo accounts

| Email | Password | Role |
|-------|----------|------|
| admin@uno.local | Password1 | ADMIN |
| player@uno.local | Password1 | USER |

## Scripts

- `npm run dev` — custom server (Next + Socket.IO)
- `npm test` — game engine unit tests
- `npm run db:seed` — seed achievements + demo users
- `npm run build` / `npm start` — production

## Features

Authentication, profiles, friends, lobbies (2–5 players), public matchmaking, spectator mode, reconnect, UNO / Catch UNO, chat, leaderboards, XP/levels/achievements, and an admin panel.
