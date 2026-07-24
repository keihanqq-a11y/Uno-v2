/**
 * Standalone Socket.IO server (separate from Next.js).
 * Avoids the Windows/tsx AsyncLocalStorage crash with custom Next servers.
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createServer } from "http";

// tsx does not load .env — load it before Prisma boots
const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

import { initSocketServer } from "./src/server/socket";

const port = Number(process.env.SOCKET_PORT ?? 3001);

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, service: "unox-socket", port }));
});

initSocketServer(httpServer);

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`> UnoX sockets ready on http://localhost:${port}`);
});
