#!/usr/bin/env node
/**
 * One-command local setup for Windows / Mac / Linux.
 * Creates .env (SQLite), pushes schema, seeds demo data.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");

const sqliteEnv = `DATABASE_URL="file:./dev.db"
JWT_SECRET="uno-premium-jwt-secret-change-in-production-d4af37"
JWT_REFRESH_SECRET="uno-premium-refresh-secret-change-in-production"
APP_URL="http://localhost:3000"
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

console.log("→ Writing .env for SQLite (no Postgres needed)…");
fs.writeFileSync(envPath, sqliteEnv);
if (!fs.existsSync(examplePath)) {
  fs.writeFileSync(examplePath, sqliteEnv);
}

function run(cmd) {
  console.log(`→ ${cmd}`);
  execSync(cmd, { cwd: root, stdio: "inherit" });
}

run("npx prisma generate");
run("npx prisma db push");
run("npm run db:seed");

console.log("\n✅ Setup complete.");
console.log("Run:  npm run dev");
console.log("Open: http://localhost:3000/play");
console.log('Click "Start vs bots"\n');
