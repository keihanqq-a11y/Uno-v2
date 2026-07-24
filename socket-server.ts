/**
 * Standalone Socket.IO server (separate from Next.js).
 * Avoids the Windows/tsx AsyncLocalStorage crash with custom Next servers.
 */
import { createServer } from "http";
import { initSocketServer } from "./src/server/socket";

const port = Number(process.env.SOCKET_PORT ?? 3001);

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, service: "uno-socket", port }));
});

initSocketServer(httpServer);

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`> UNO sockets ready on http://localhost:${port}`);
});
