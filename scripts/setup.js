#!/usr/bin/env node
/**
 * Non-interactive local setup (Windows-safe).
 * Creates SQLite .env if missing, pushes schema, seeds reference data.
 * Does NOT wipe your player accounts / balance / history.
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
SMTP_FROM="UnoX <noreply@unox.local>"
SMTP_USER=""
SMTP_PASS=""
UPLOAD_DIR="./uploads"
MAX_AVATAR_SIZE=2097152
HOUSE_RULE_MISSED_UNO_PENALTY=5
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
      PRISMA_HIDE_UPDATE_MESSAGE: "1",
      CHECKPOINT_DISABLE: "1",
    },
    windowsHide: true,
  });
}

try {
  if (!fs.existsSync(envPath)) {
    log("→ Writing .env for SQLite…");
    fs.writeFileSync(envPath, sqliteEnv);
  } else {
    log("→ Keeping existing .env (your settings stay)");
  }

  // Keep prisma/dev.db — never delete player data on setup.
  const dbPath = path.join(root, "prisma", "dev.db");
  if (fs.existsSync(dbPath)) {
    log("→ Existing database found — preserving accounts, balances, and history");
  } else {
    log("→ No database yet — creating a fresh one");
  }

  run("npx prisma generate");
  // Additive schema updates; do not wipe tables.
  run("npx prisma db push --skip-generate");
  run("npx tsx scripts/seed.ts");

  log("\n✅ Setup complete. Your profile is kept across visits.");
  log("IMPORTANT: Stop any running npm run dev (Ctrl+C), then start fresh:");
  log("  npm run dev");
  log("Then open: http://localhost:3000/play\n");
} catch (err) {
  console.error("\n❌ Setup failed.");
  console.error(err && err.message ? err.message : err);
  process.exit(1);
}
