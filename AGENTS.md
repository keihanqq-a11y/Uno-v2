# UNO Premium

Multiplayer UNO card game. Next.js 15 (App Router, React 19) web app plus a standalone Socket.IO server for real‑time gameplay, backed by SQLite via Prisma. No Docker/Postgres/Redis required.

## Cursor Cloud specific instructions

### Services
- `web` — Next.js app on port `3000` (pages under `src/app`, API routes under `src/app/api`).
- `socket` — standalone Socket.IO server on port `3001` (`socket-server.ts` → `src/server/socket`). Required for lobbies, gameplay, and bots.

Both are started together by `npm run dev` (via `concurrently`). Standard commands live in `package.json` (`dev`, `build`, `start`, `lint`, `test`, `setup`, `db:*`). Run with `npm run dev`, not `next dev` — `next dev` alone omits the socket server, so multiplayer/gameplay will hang on "loading".

### Environment / DB caveats
- `.env` and the SQLite `dev.db` are gitignored and are created by `npm run setup` (writes `.env`, runs `prisma db push`, seeds data). The update script runs this on startup, so a fresh pod is ready to run.
- `npm run setup` is destructive: it deletes and recreates `dev.db` and re‑seeds. Do NOT re-run it mid-session if you want to keep game/user state; use `npm run db:seed` or `prisma db push` directly instead.
- Seeded accounts (password `Password1`): `admin` (ADMIN role) and `goldhand` (demo user).

### Gotcha: balance required to play
Starting a game (Vs bots or lobbies) requires the user's `balanceUsd > 0`. Freshly created guest/seeded users start at `0`, which makes the "Vs bots" button open a wallet/deposit modal instead of starting a game. To play in a dev/test flow, either deposit via the wallet UI or set a balance directly, e.g.:

```bash
npx tsx -e "import {prisma} from './src/lib/db/prisma'; prisma.user.updateMany({data:{balanceUsd:100}}).then(r=>{console.log('updated',r.count);process.exit(0)})"
```

### Verify it's running
- `curl http://localhost:3000/api/health` → `{"ok":true,...}`
- `curl http://localhost:3001/` → `{"ok":true,"service":"unox-socket",...}`
- App entry for gameplay: `http://localhost:3000/play`
