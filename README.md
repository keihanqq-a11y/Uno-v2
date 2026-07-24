# UNO Premium

Multiplayer UNO — works with **only Node.js**. No Docker, Postgres, or Redis needed.

## Windows (easiest)

1. Install Node.js LTS from https://nodejs.org
2. Open PowerShell:

```powershell
cd $HOME\Desktop
git clone https://github.com/keihanqq-a11y/Uno-v2.git
cd Uno-v2
git checkout cursor/multiplayer-uno-9614

npm install
Copy-Item .env.example .env
npx prisma db push
npm run db:seed
npm run dev
```

3. Open http://localhost:3000/play  
   No login — you join as a guest automatically.

## Stack

- Next.js + TypeScript + Tailwind
- Socket.IO (custom server)
- Prisma + **SQLite** (local file database)
- In-memory matchmaking (no Redis)

## Scripts

- `npm run dev` — start app
- `npm test` — game engine tests
- `npm run db:seed` — seed demo data
