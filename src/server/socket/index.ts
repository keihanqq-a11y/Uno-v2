import type { Server as HttpServer } from "http";
import { Server, type Socket } from "socket.io";
import { prisma } from "@/lib/db/prisma";
import { recordMatchResult } from "@/lib/rewards";
import { enqueue, dequeue } from "@/server/matchmaking/queue";
import * as lobbies from "@/server/socket/lobby-manager";
import * as games from "@/server/socket/game-manager";
import { botLobbyPlayer, createBotUser, rememberBotFromUsername } from "@/server/socket/bots";
import type { CardColor } from "@/types/game";
import { toPublicView } from "@/server/game/engine";

interface SocketUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface AuthedSocket extends Socket {
  data: { user?: SocketUser; lobbyId?: string; gameId?: string };
}

let io: Server | null = null;

export function getIO(): Server | null {
  return io;
}

async function resolveUserFromCookie(cookieHeader?: string): Promise<SocketUser | null> {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)uno_session=([^;]+)/);
  if (!match) return null;
  const token = decodeURIComponent(match[1]);
  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          isBanned: true,
        },
      },
    },
  });
  if (!session || session.expiresAt < new Date() || session.user.isBanned) return null;
  return {
    id: session.user.id,
    username: session.user.username,
    displayName: session.user.displayName,
    avatarUrl: session.user.avatarUrl,
  };
}

function lobbyRoom(id: string) {
  return `lobby:${id}`;
}

function gameRoom(id: string) {
  return `game:${id}`;
}

function broadcastLobby(lobbyId: string) {
  const lobby = lobbies.getLobby(lobbyId);
  if (!lobby || !io) return;
  io.to(lobbyRoom(lobbyId)).emit("lobby:state", lobby);
}

function broadcastGame(gameId: string) {
  if (!io) return;
  const g = games.getGame(gameId);
  if (!g) return;
  const sockets = io.sockets.adapter.rooms.get(gameRoom(gameId));
  if (!sockets) return;
  for (const sid of sockets) {
    const s = io.sockets.sockets.get(sid) as AuthedSocket | undefined;
    const userId = s?.data.user?.id ?? null;
    s?.emit("game:state", toPublicView(g.state, userId));
  }
}

async function persistGameResults(gameId: string) {
  const g = games.getGame(gameId);
  if (!g || g.state.phase !== "finished" || !g.state.winnerId) return;

  const winner = g.state.players.find((p) => p.id === g.state.winnerId);
  const sorted = [...g.state.players].sort((a, b) => a.hand.length - b.hand.length);

  // Lobbies are realtime/in-memory; persist finished games without FK to lobby rows.
  const dbGame = await prisma.game.create({
    data: {
      id: gameId,
      lobbyId: null,
      status: "FINISHED",
      playerCount: g.state.players.length,
      winnerId: winner?.userId,
      startedAt: g.state.startedAt ? new Date(g.state.startedAt) : new Date(),
      endedAt: new Date(),
      turnTimerSec: g.state.turnTimerSec,
      missedUnoPenalty: g.state.missedUnoPenalty,
      players: {
        create: g.state.players.map((p) => ({
          userId: p.userId,
          seat: p.seat,
          finalCards: p.hand.length,
          placement: sorted.findIndex((x) => x.id === p.id) + 1,
          isConnected: p.connected,
        })),
      },
    },
  });

  for (const p of sorted) {
    const placement = sorted.findIndex((x) => x.id === p.id) + 1;
    await recordMatchResult({
      userId: p.userId,
      gameId: dbGame.id,
      won: p.id === g.state.winnerId,
      placement,
      playerCount: g.state.players.length,
      cardsLeft: p.hand.length,
    });
  }

  await prisma.analyticsEvent.create({
    data: {
      type: "game_finished",
      userId: winner?.userId,
      meta: { gameId, players: g.state.players.length },
    },
  });
}

export function initSocketServer(httpServer: HttpServer) {
  const origin = process.env.APP_URL ?? "http://localhost:3000";
  io = new Server(httpServer, {
    path: "/api/socketio",
    cors: {
      origin: [origin, "http://localhost:3000", "http://127.0.0.1:3000"],
      credentials: true,
    },
  });

  io.use(async (socket: AuthedSocket, next) => {
    try {
      const user = await resolveUserFromCookie(socket.request.headers.cookie);
      if (!user) return next(new Error("Unauthorized"));
      socket.data.user = user;
      next();
    } catch (e) {
      next(e as Error);
    }
  });

  io.on("connection", (socket: AuthedSocket) => {
    const user = socket.data.user!;
    socket.join(`user:${user.id}`);

    // Reconnect into active game if any
    const existing = games.getGameByUser(user.id);
    if (existing) {
      games.reconnectPlayer(existing.state.id, user.id);
      socket.data.gameId = existing.state.id;
      socket.join(gameRoom(existing.state.id));
      socket.emit("game:state", games.viewFor(existing.state.id, user.id));
      if (existing.state.lobbyId) {
        socket.data.lobbyId = existing.state.lobbyId;
        socket.join(lobbyRoom(existing.state.lobbyId));
      }
    }

    socket.on("lobby:create", (payload, cb) => {
      const maxPlayers = Math.min(5, Math.max(2, Number(payload?.maxPlayers ?? 4)));
      const mode = payload?.mode === "PUBLIC" ? "PUBLIC" : "PRIVATE";
      const allowSpectators = payload?.allowSpectators !== false;
      const lobby = lobbies.createLobby({
        hostId: user.id,
        host: {
          userId: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          ready: false,
          connected: true,
          isSpectator: false,
        },
        maxPlayers,
        mode,
        allowSpectators,
      });
      socket.data.lobbyId = lobby.id;
      socket.join(lobbyRoom(lobby.id));
      cb?.({ ok: true, lobby });
      broadcastLobby(lobby.id);
    });

    socket.on("lobby:join", (payload, cb) => {
      const code = String(payload?.code ?? "").toUpperCase();
      const asSpectator = !!payload?.asSpectator;
      const result = lobbies.joinLobby(
        code,
        {
          userId: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          ready: false,
          connected: true,
          isSpectator: asSpectator,
        },
        asSpectator,
      );
      if (!result.ok) return cb?.({ ok: false, error: result.error });
      socket.data.lobbyId = result.lobby.id;
      socket.join(lobbyRoom(result.lobby.id));
      if (result.lobby.gameId) {
        socket.data.gameId = result.lobby.gameId;
        socket.join(gameRoom(result.lobby.gameId));
        games.reconnectPlayer(result.lobby.gameId, user.id);
        socket.emit("game:state", games.viewFor(result.lobby.gameId, user.id));
      }
      cb?.({ ok: true, lobby: result.lobby });
      broadcastLobby(result.lobby.id);
    });

    socket.on("lobby:leave", (_payload, cb) => {
      const lobbyId = socket.data.lobbyId;
      if (!lobbyId) return cb?.({ ok: true });
      socket.leave(lobbyRoom(lobbyId));
      const lobby = lobbies.leaveLobby(lobbyId, user.id);
      socket.data.lobbyId = undefined;
      cb?.({ ok: true });
      if (lobby) broadcastLobby(lobby.id);
    });

    socket.on("lobby:ready", (payload, cb) => {
      const lobbyId = socket.data.lobbyId;
      if (!lobbyId) return cb?.({ ok: false, error: "Not in a lobby" });
      const lobby = lobbies.setReady(lobbyId, user.id, !!payload?.ready);
      cb?.({ ok: true, lobby });
      if (lobby) broadcastLobby(lobby.id);
    });

    socket.on("lobby:add_bot", async (_payload, cb) => {
      const lobbyId = socket.data.lobbyId;
      if (!lobbyId) return cb?.({ ok: false, error: "Not in a lobby" });
      const lobby = lobbies.getLobby(lobbyId);
      if (!lobby) return cb?.({ ok: false, error: "Lobby not found" });
      if (lobby.hostId !== user.id) return cb?.({ ok: false, error: "Only host can add bots" });
      if (lobby.players.length >= lobby.maxPlayers) {
        return cb?.({ ok: false, error: "Lobby is full" });
      }

      try {
        const slot = lobby.players.filter((p) => p.isBot || p.username.startsWith("bot_")).length;
        const bot = await createBotUser(slot);
        const result = lobbies.addBotPlayer(lobbyId, botLobbyPlayer(bot));
        if (!result.ok) return cb?.(result);
        broadcastLobby(lobbyId);
        cb?.({ ok: true, lobby: result.lobby });
      } catch (e) {
        console.error(e);
        cb?.({ ok: false, error: "Could not create bot" });
      }
    });

    socket.on("lobby:remove_bot", (payload, cb) => {
      const lobbyId = socket.data.lobbyId;
      if (!lobbyId) return cb?.({ ok: false, error: "Not in a lobby" });
      const lobby = lobbies.getLobby(lobbyId);
      if (!lobby) return cb?.({ ok: false, error: "Lobby not found" });
      if (lobby.hostId !== user.id) return cb?.({ ok: false, error: "Only host can remove bots" });
      const botUserId = String(payload?.botUserId ?? "");
      const result = lobbies.removeBotPlayer(lobbyId, botUserId);
      if (!result.ok) return cb?.(result);
      broadcastLobby(lobbyId);
      cb?.({ ok: true, lobby: result.lobby });
    });

    /** One-click: create lobby, fill with bots, start match. */
    socket.on("play:vs_bots", async (payload, cb) => {
      const botCount = Math.min(4, Math.max(1, Number(payload?.bots ?? 3)));
      const maxPlayers = botCount + 1;

      try {
        const lobby = lobbies.createLobby({
          hostId: user.id,
          host: {
            userId: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            ready: true,
            connected: true,
            isSpectator: false,
          },
          maxPlayers,
          mode: "PRIVATE",
          allowSpectators: false,
        });

        for (let i = 0; i < botCount; i++) {
          const bot = await createBotUser(i);
          lobbies.addBotPlayer(lobby.id, botLobbyPlayer(bot));
        }

        const fresh = lobbies.getLobby(lobby.id)!;
        for (const p of fresh.players) {
          if (p.isBot || p.username.startsWith("bot_")) {
            rememberBotFromUsername(p.userId, p.username);
          }
        }

        const state = games.startGame({
          lobbyId: lobby.id,
          hostId: lobby.hostId,
          players: fresh.players.map((p) => ({
            userId: p.userId,
            username: p.username,
            displayName: p.displayName,
            avatarUrl: p.avatarUrl,
          })),
          maxPlayers,
          onStateChange: async (s) => {
            broadcastGame(s.id);
            if (s.phase === "finished") {
              await persistGameResults(s.id).catch(console.error);
              io?.to(gameRoom(s.id)).emit("game:finished", {
                winnerId: s.winnerId,
                lobbyCode: lobby.code,
              });
            }
          },
        });

        lobbies.markLobbyInGame(lobby.id, state.id);
        socket.data.lobbyId = lobby.id;
        socket.data.gameId = state.id;
        socket.join(lobbyRoom(lobby.id));
        socket.join(gameRoom(state.id));

        broadcastLobby(lobby.id);
        broadcastGame(state.id);
        socket.emit("game:started", { gameId: state.id });
        cb?.({ ok: true, gameId: state.id, code: lobby.code });
      } catch (e) {
        console.error(e);
        cb?.({ ok: false, error: "Could not start bot match" });
      }
    });

    socket.on("lobby:chat", (payload, cb) => {
      const lobbyId = socket.data.lobbyId;
      if (!lobbyId) return cb?.({ ok: false, error: "Not in a lobby" });
      const content = String(payload?.content ?? "");
      const msg = lobbies.addChat(lobbyId, {
        userId: user.id,
        username: user.username,
        content,
        isSystem: false,
        isEmoji: !!payload?.isEmoji,
      });
      if (!msg) return cb?.({ ok: false, error: "Failed" });
      io?.to(lobbyRoom(lobbyId)).emit("lobby:chat", msg);
      cb?.({ ok: true, message: msg });
    });

    socket.on("lobby:invite", async (payload, cb) => {
      const lobbyId = socket.data.lobbyId;
      const friendId = String(payload?.friendId ?? "");
      if (!lobbyId || !friendId) return cb?.({ ok: false, error: "Invalid invite" });
      const lobby = lobbies.getLobby(lobbyId);
      if (!lobby) return cb?.({ ok: false, error: "Lobby not found" });

      await prisma.notification.create({
        data: {
          userId: friendId,
          title: "Lobby invite",
          body: `${user.displayName} invited you to lobby ${lobby.code}`,
          href: `/lobby/${lobby.code}`,
        },
      });

      io?.to(`user:${friendId}`).emit("invite:received", {
        from: user,
        code: lobby.code,
        lobbyId: lobby.id,
      });
      cb?.({ ok: true });
    });

    socket.on("lobby:start", async (_payload, cb) => {
      const lobbyId = socket.data.lobbyId;
      if (!lobbyId) return cb?.({ ok: false, error: "Not in a lobby" });
      const lobby = lobbies.getLobby(lobbyId);
      if (!lobby) return cb?.({ ok: false, error: "Lobby not found" });
      if (lobby.hostId !== user.id) return cb?.({ ok: false, error: "Only host can start" });
      if (lobby.players.length < 2) return cb?.({ ok: false, error: "Need at least 2 players" });

      for (const p of lobby.players) {
        if (p.isBot || p.username.startsWith("bot_")) {
          rememberBotFromUsername(p.userId, p.username);
        }
      }

      const state = games.startGame({
        lobbyId: lobby.id,
        hostId: lobby.hostId,
        players: lobby.players.map((p) => ({
          userId: p.userId,
          username: p.username,
          displayName: p.displayName,
          avatarUrl: p.avatarUrl,
        })),
        maxPlayers: lobby.maxPlayers,
        onStateChange: async (s) => {
          broadcastGame(s.id);
          if (s.phase === "finished") {
            await persistGameResults(s.id).catch(console.error);
            io?.to(gameRoom(s.id)).emit("game:finished", {
              winnerId: s.winnerId,
              lobbyCode: lobby.code,
            });
          }
        },
      });

      lobbies.markLobbyInGame(lobby.id, state.id);

      // Join all lobby sockets into game room
      const room = io?.sockets.adapter.rooms.get(lobbyRoom(lobby.id));
      if (room && io) {
        for (const sid of room) {
          const s = io.sockets.sockets.get(sid) as AuthedSocket | undefined;
          if (!s) continue;
          s.data.gameId = state.id;
          s.join(gameRoom(state.id));
        }
      }

      broadcastLobby(lobby.id);
      broadcastGame(state.id);
      io?.to(lobbyRoom(lobby.id)).emit("game:started", { gameId: state.id });
      cb?.({ ok: true, gameId: state.id });
    });

    socket.on("lobby:rematch", (_payload, cb) => {
      const lobbyId = socket.data.lobbyId;
      if (!lobbyId) return cb?.({ ok: false, error: "Not in a lobby" });
      const lobby = lobbies.getLobby(lobbyId);
      if (!lobby || lobby.hostId !== user.id) {
        return cb?.({ ok: false, error: "Only host can rematch" });
      }
      if (lobby.gameId) games.endAndCleanup(lobby.gameId);
      const reset = lobbies.resetLobbyForRematch(lobbyId);
      broadcastLobby(lobbyId);
      cb?.({ ok: true, lobby: reset });
    });

    socket.on("matchmaking:join", async (payload, cb) => {
      const size = Math.min(5, Math.max(2, Number(payload?.size ?? 4)));
      const matched = await enqueue(size, {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      });

      if (matched.length >= size) {
        const host = matched[0];
        const lobby = lobbies.createLobby({
          hostId: host.userId,
          host: {
            userId: host.userId,
            username: host.username,
            displayName: host.displayName,
            avatarUrl: host.avatarUrl,
            ready: true,
            connected: true,
            isSpectator: false,
          },
          maxPlayers: size,
          mode: "PUBLIC",
          allowSpectators: true,
        });

        for (const p of matched.slice(1)) {
          lobbies.joinLobby(lobby.code, {
            userId: p.userId,
            username: p.username,
            displayName: p.displayName,
            avatarUrl: p.avatarUrl,
            ready: true,
            connected: true,
            isSpectator: false,
          });
        }

        for (const p of matched) {
          io?.to(`user:${p.userId}`).emit("matchmaking:found", {
            code: lobby.code,
            lobbyId: lobby.id,
          });
        }
        cb?.({ ok: true, matched: true, code: lobby.code });
      } else {
        cb?.({ ok: true, matched: false, size });
      }
    });

    socket.on("matchmaking:leave", async (payload, cb) => {
      const size = Math.min(5, Math.max(2, Number(payload?.size ?? 4)));
      await dequeue(size, user.id);
      cb?.({ ok: true });
    });

    socket.on("game:sync", (payload, cb) => {
      const requestedId = String(payload?.gameId ?? socket.data.gameId ?? "");
      if (!requestedId) return cb?.({ ok: false, error: "Missing game id" });

      const managed = games.getGame(requestedId) ?? games.getGameByUser(user.id);
      if (!managed) return cb?.({ ok: false, error: "Game not found — start a new match" });

      const gameId = managed.state.id;
      socket.data.gameId = gameId;
      socket.join(gameRoom(gameId));
      games.reconnectPlayer(gameId, user.id);

      if (managed.state.lobbyId) {
        socket.data.lobbyId = managed.state.lobbyId;
        socket.join(lobbyRoom(managed.state.lobbyId));
      }

      const lobby = managed.state.lobbyId
        ? lobbies.getLobby(managed.state.lobbyId)
        : null;

      const view = games.viewFor(gameId, user.id);
      socket.emit("game:state", view);
      cb?.({
        ok: true,
        game: view,
        lobbyCode: lobby?.code ?? null,
      });
    });

    socket.on("game:play", (payload, cb) => {
      const gameId = socket.data.gameId;
      if (!gameId) return cb?.({ ok: false, error: "Not in a game" });
      const result = games.applyPlay(
        gameId,
        user.id,
        String(payload?.cardId ?? ""),
        payload?.chosenColor as CardColor | undefined,
      );
      if (!result.ok) return cb?.(result);
      broadcastGame(gameId);
      const action = result.state.lastAction;
      if (action?.type === "play") {
        io?.to(gameRoom(gameId)).emit("game:animation", {
          kind: "play",
          playerId: action.playerId,
          card: action.card,
        });
      }
      cb?.({ ok: true });
    });

    socket.on("game:draw", (_payload, cb) => {
      const gameId = socket.data.gameId;
      if (!gameId) return cb?.({ ok: false, error: "Not in a game" });
      const result = games.applyDraw(gameId, user.id);
      if (!result.ok) return cb?.(result);
      broadcastGame(gameId);
      io?.to(gameRoom(gameId)).emit("game:animation", {
        kind: "draw",
        playerId: result.state.players.find((p) => p.userId === user.id)?.id,
        count: result.drawn.length,
      });
      cb?.({ ok: true });
    });

    socket.on("game:choose_color", (payload, cb) => {
      const gameId = socket.data.gameId;
      if (!gameId) return cb?.({ ok: false, error: "Not in a game" });
      const color = payload?.color as Exclude<CardColor, "wild">;
      if (!["red", "yellow", "green", "blue"].includes(color)) {
        return cb?.({ ok: false, error: "Invalid color" });
      }
      const result = games.applyChooseColor(gameId, user.id, color);
      if (!result.ok) return cb?.(result);
      broadcastGame(gameId);
      cb?.({ ok: true });
    });

    socket.on("game:uno", (_payload, cb) => {
      const gameId = socket.data.gameId;
      if (!gameId) return cb?.({ ok: false, error: "Not in a game" });
      const result = games.applyCallUno(gameId, user.id);
      if (!result.ok) return cb?.(result);
      broadcastGame(gameId);
      io?.to(gameRoom(gameId)).emit("game:uno", {
        playerId: result.state.players.find((p) => p.userId === user.id)?.id,
      });
      io?.to(gameRoom(gameId)).emit("game:animation", { kind: "uno" });
      cb?.({ ok: true });
    });

    socket.on("game:catch_uno", (payload, cb) => {
      const gameId = socket.data.gameId;
      if (!gameId) return cb?.({ ok: false, error: "Not in a game" });
      const result = games.applyCatchUno(gameId, user.id, String(payload?.targetPlayerId ?? ""));
      if (!result.ok) return cb?.(result);
      broadcastGame(gameId);
      io?.to(gameRoom(gameId)).emit("game:catch_uno", {
        catcherId: result.state.players.find((p) => p.userId === user.id)?.id,
        targetId: payload?.targetPlayerId,
        penalty: result.penalty,
      });
      io?.to(gameRoom(gameId)).emit("game:animation", {
        kind: "catch",
        penalty: result.penalty,
      });
      cb?.({ ok: true });
    });

    socket.on("game:chat", (payload, cb) => {
      const gameId = socket.data.gameId;
      if (!gameId) return cb?.({ ok: false, error: "Not in a game" });
      const msg = games.addGameChat(gameId, {
        userId: user.id,
        username: user.username,
        content: String(payload?.content ?? ""),
        isSystem: false,
        isEmoji: !!payload?.isEmoji,
      });
      if (!msg) return cb?.({ ok: false, error: "Failed" });
      io?.to(gameRoom(gameId)).emit("game:chat", msg);
      cb?.({ ok: true, message: msg });
    });

    socket.on("disconnect", () => {
      if (socket.data.lobbyId) {
        lobbies.setConnected(socket.data.lobbyId, user.id, false);
        broadcastLobby(socket.data.lobbyId);
      }
      games.disconnectPlayer(user.id);
      if (socket.data.gameId) broadcastGame(socket.data.gameId);
    });
  });

  return io;
}
