#!/usr/bin/env node
/**
 * Non-interactive local setup (Windows-safe).
 * Creates SQLite .env, pushes schema, seeds data.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");

const sqliteEnv = `DATABASE_URL="file:./dev.db"
JWT_SECRET="uno-premium-jwt-secret-change-in-production-d4af37"
JWT_REFRESH_SECRET="uno-premium-refresh-secret-change-in-production"
APP_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
SOCKET_PORT=3001
SMTP_HOST="localhost"
SMTP_PORT="1025"
SMTP_FROM="UNO Premium <noreply@uno.local>"
SMTP_USER=""
SMTP_PASS=""
UPLOAD_DIR="./uploads"
MAX_AVATAR_SIZE=2097152
HOUSE_RULE_MISSED_UNO_PENALTY=2
TURN_TIMER_SECONDS=30
NODE_ENV="development"
PORT=3000
`;

function log(msg) {
  console.log(msg);
}

function run(cmd) {
  log(`\n→ ${cmd}`);
  execSync(cmd, {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      // Prevent Prisma from waiting on prompts / telemetrics
      PRISMA_HIDE_UPDATE_MESSAGE: "1",
      CHECKPOINT_DISABLE: "1",
    },
    windowsHide: true,
  });
}

try {
  log("→ Writing .env for SQLite…");
  fs.writeFileSync(envPath, sqliteEnv);

  // Remove old sqlite lock files if present
  for (const f of ["dev.db", "dev.db-journal"]) {
    const p = path.join(root, "prisma", f);
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {
      /* ignore */
    }
  }

  run("npx prisma generate");
  // --accept-data-loss avoids interactive "y/N" prompts on Windows
  run("npx prisma db push --accept-data-loss --skip-generate");
  run("npx tsx scripts/seed.ts");

  log("\n✅ Setup complete.");
  log("Next:  npm run dev");
  log("Then open: http://localhost:3000/play\n");
} catch (err) {
  console.error("\n❌ Setup failed.");
  console.error(err && err.message ? err.message : err);
  process.exit(1);
}
