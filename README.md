# UNO Premium

Works with **only Node.js**. No Docker / Postgres / Redis.

## Windows — fix & play

Open PowerShell in the project folder:

```powershell
# Stop old server first: Ctrl+C

cd $HOME\Desktop\Uno-v2
git pull
npm install
npm run setup
npm run dev
```

Open: **http://localhost:3000/play**

Click **Start vs bots**.

You must use `npm run dev` (not `next dev`) so multiplayer/sockets work.

## If it says loading / waiting forever

```powershell
Ctrl+C
npm run setup
npm run dev
```

Then hard-refresh the browser: `Ctrl+Shift+R`

## Features

- Guest play (no login)
- Play vs bots (1–4)
- Private lobbies + Add bot
- Server-authoritative UNO engine
