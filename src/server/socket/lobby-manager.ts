import { nanoid } from "nanoid";
import type { LobbyPlayer, LobbyState, ChatMessagePayload } from "@/types/game";
import { generateLobbyCode, sanitizeChat } from "@/lib/utils";

const lobbies = new Map<string, LobbyState>();
const lobbyByCode = new Map<string, string>();

export function getLobby(id: string): LobbyState | undefined {
  return lobbies.get(id);
}

export function getLobbyByCode(code: string): LobbyState | undefined {
  const id = lobbyByCode.get(code.toUpperCase());
  return id ? lobbies.get(id) : undefined;
}

function takenSeats(lobby: LobbyState): Set<number> {
  return new Set(
    lobby.players
      .map((p) => p.seat)
      .filter((s): s is number => typeof s === "number" && s >= 0),
  );
}

export function nextFreeSeat(lobby: LobbyState): number | null {
  const taken = takenSeats(lobby);
  for (let i = 0; i < lobby.maxPlayers; i++) {
    if (!taken.has(i)) return i;
  }
  return null;
}

export function seatedPlayers(lobby: LobbyState): LobbyPlayer[] {
  return lobby.players
    .filter((p) => p.seat != null)
    .sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0));
}

export function createLobby(params: {
  hostId: string;
  host: LobbyPlayer;
  maxPlayers: number;
  mode: "PRIVATE" | "PUBLIC";
  allowSpectators: boolean;
  stakeUsd?: number;
}): LobbyState {
  const id = nanoid();
  let code = generateLobbyCode();
  while (lobbyByCode.has(code)) code = generateLobbyCode();

  const stakeUsd = Math.max(0, Number(params.stakeUsd ?? 1));
  const host: LobbyPlayer = {
    ...params.host,
    isSpectator: false,
    ready: params.host.ready ?? false,
    seat: params.host.seat ?? 0,
    buyInUsd: params.host.buyInUsd > 0 ? params.host.buyInUsd : stakeUsd,
  };

  const lobby: LobbyState = {
    id,
    code,
    hostId: params.hostId,
    mode: params.mode,
    maxPlayers: params.maxPlayers,
    stakeUsd,
    status: "WAITING",
    allowSpectators: params.allowSpectators,
    players: [host],
    spectators: [],
    chat: [
      {
        id: nanoid(),
        userId: null,
        username: null,
        content: `${host.displayName} created the lobby`,
        isSystem: true,
        isEmoji: false,
        createdAt: Date.now(),
      },
    ],
    gameId: null,
    createdAt: Date.now(),
  };

  lobbies.set(id, lobby);
  lobbyByCode.set(code, id);
  return lobby;
}

export function joinLobby(
  code: string,
  player: LobbyPlayer,
  asSpectator = false,
  opts?: { autoSeat?: boolean; preferredSeat?: number },
): { ok: true; lobby: LobbyState } | { ok: false; error: string } {
  const lobby = getLobbyByCode(code);
  if (!lobby) return { ok: false, error: "Lobby not found" };
  if (lobby.status !== "WAITING" && !asSpectator) {
    if (!lobby.allowSpectators) return { ok: false, error: "Game already started" };
    asSpectator = true;
  }

  const existing =
    lobby.players.find((p) => p.userId === player.userId) ||
    lobby.spectators.find((p) => p.userId === player.userId);

  if (existing) {
    existing.connected = true;
    existing.displayName = player.displayName;
    existing.avatarUrl = player.avatarUrl;
    if (
      opts?.autoSeat &&
      existing.seat == null &&
      !existing.isSpectator &&
      lobby.status === "WAITING"
    ) {
      const seat =
        typeof opts.preferredSeat === "number" ? opts.preferredSeat : nextFreeSeat(lobby);
      if (seat != null && !takenSeats(lobby).has(seat)) {
        existing.seat = seat;
        existing.buyInUsd = lobby.stakeUsd;
      }
    }
    return { ok: true, lobby };
  }

  if (asSpectator) {
    if (!lobby.allowSpectators) return { ok: false, error: "Spectators not allowed" };
    lobby.spectators.push({
      ...player,
      isSpectator: true,
      ready: false,
      seat: null,
      buyInUsd: 0,
    });
  } else {
    const seatedCount = seatedPlayers(lobby).length;
    if (seatedCount >= lobby.maxPlayers && !opts?.autoSeat) {
      // Still allow joining the room unseated if table is full of sitters? No — full.
      if (lobby.players.length >= lobby.maxPlayers) {
        if (lobby.allowSpectators) {
          lobby.spectators.push({
            ...player,
            isSpectator: true,
            ready: false,
            seat: null,
            buyInUsd: 0,
          });
          pushSystem(lobby, `${player.displayName} joined`);
          return { ok: true, lobby };
        }
        return { ok: false, error: "Lobby is full" };
      }
    }

    if (lobby.players.length >= lobby.maxPlayers) {
      if (lobby.allowSpectators) {
        lobby.spectators.push({
          ...player,
          isSpectator: true,
          ready: false,
          seat: null,
          buyInUsd: 0,
        });
      } else {
        return { ok: false, error: "Lobby is full" };
      }
    } else {
      let seat: number | null = null;
      let buyInUsd = 0;
      if (opts?.autoSeat) {
        const preferred =
          typeof opts.preferredSeat === "number" ? opts.preferredSeat : nextFreeSeat(lobby);
        if (preferred != null && !takenSeats(lobby).has(preferred)) {
          seat = preferred;
          buyInUsd = lobby.stakeUsd;
        } else {
          const free = nextFreeSeat(lobby);
          if (free != null) {
            seat = free;
            buyInUsd = lobby.stakeUsd;
          }
        }
      }
      lobby.players.push({
        ...player,
        isSpectator: false,
        ready: player.ready ?? false,
        seat,
        buyInUsd,
      });
    }
  }

  pushSystem(lobby, `${player.displayName} joined`);
  return { ok: true, lobby };
}

/** Claim or move to an empty seat around the table. */
export function sitAtSeat(
  lobbyId: string,
  userId: string,
  seat: number,
): { ok: true; lobby: LobbyState } | { ok: false; error: string } {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return { ok: false, error: "Lobby not found" };
  if (lobby.status !== "WAITING") return { ok: false, error: "Game already started" };
  if (!Number.isInteger(seat) || seat < 0 || seat >= lobby.maxPlayers) {
    return { ok: false, error: "Invalid seat" };
  }

  const occupant = lobby.players.find((p) => p.seat === seat);
  if (occupant && occupant.userId !== userId) {
    return { ok: false, error: "Seat taken" };
  }

  let player = lobby.players.find((p) => p.userId === userId);
  if (!player) {
    const specIdx = lobby.spectators.findIndex((p) => p.userId === userId);
    if (specIdx >= 0) {
      if (seatedPlayers(lobby).length >= lobby.maxPlayers && !occupant) {
        return { ok: false, error: "Table is full" };
      }
      player = lobby.spectators.splice(specIdx, 1)[0];
      player.isSpectator = false;
      lobby.players.push(player);
    } else {
      return { ok: false, error: "Join the lobby first" };
    }
  }

  if (occupant?.userId === userId) {
    return { ok: true, lobby };
  }

  if (seatedPlayers(lobby).length >= lobby.maxPlayers && player.seat == null) {
    return { ok: false, error: "Table is full" };
  }

  player.seat = seat;
  player.buyInUsd = lobby.stakeUsd;
  player.isSpectator = false;
  return { ok: true, lobby };
}

export function leaveLobby(
  lobbyId: string,
  userId: string,
): LobbyState | null {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return null;

  const leaving =
    lobby.players.find((p) => p.userId === userId) ||
    lobby.spectators.find((p) => p.userId === userId);

  lobby.players = lobby.players.filter((p) => p.userId !== userId);
  lobby.spectators = lobby.spectators.filter((p) => p.userId !== userId);

  if (leaving) pushSystem(lobby, `${leaving.displayName} left`);

  if (lobby.players.length === 0) {
    destroyLobby(lobbyId);
    return null;
  }

  if (lobby.hostId === userId) {
    const nextHost =
      lobby.players.find((p) => !p.isBot && !p.username.startsWith("bot_")) ??
      lobby.players[0];
    lobby.hostId = nextHost.userId;
    pushSystem(lobby, `${nextHost.displayName} is now the host`);
  }

  return lobby;
}

export function addBotPlayer(
  lobbyId: string,
  bot: LobbyPlayer,
): { ok: true; lobby: LobbyState } | { ok: false; error: string } {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return { ok: false, error: "Lobby not found" };
  if (lobby.status !== "WAITING") return { ok: false, error: "Game already started" };
  const free = nextFreeSeat(lobby);
  if (free == null || lobby.players.length >= lobby.maxPlayers) {
    return { ok: false, error: "Lobby is full" };
  }

  lobby.players.push({
    ...bot,
    ready: true,
    connected: true,
    isSpectator: false,
    isBot: true,
    seat: free,
    buyInUsd: lobby.stakeUsd,
  });
  pushSystem(lobby, `${bot.displayName} joined the table`);
  return { ok: true, lobby };
}

export function removeBotPlayer(
  lobbyId: string,
  botUserId: string,
): { ok: true; lobby: LobbyState } | { ok: false; error: string } {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return { ok: false, error: "Lobby not found" };
  const bot = lobby.players.find(
    (p) => p.userId === botUserId && (p.isBot || p.username.startsWith("bot_")),
  );
  if (!bot) return { ok: false, error: "Bot not found" };
  lobby.players = lobby.players.filter((p) => p.userId !== botUserId);
  pushSystem(lobby, `${bot.displayName} left the table`);
  return { ok: true, lobby };
}

export function setReady(lobbyId: string, userId: string, ready: boolean) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return null;
  const player = lobby.players.find((p) => p.userId === userId);
  if (player) {
    if (ready && player.seat == null) return lobby;
    player.ready = ready;
  }
  return lobby;
}

export function setConnected(lobbyId: string, userId: string, connected: boolean) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return null;
  const p =
    lobby.players.find((x) => x.userId === userId) ||
    lobby.spectators.find((x) => x.userId === userId);
  if (p) p.connected = connected;
  return lobby;
}

export function addChat(
  lobbyId: string,
  msg: Omit<ChatMessagePayload, "id" | "createdAt">,
): ChatMessagePayload | null {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return null;
  const payload: ChatMessagePayload = {
    ...msg,
    content: sanitizeChat(msg.content),
    id: nanoid(),
    createdAt: Date.now(),
  };
  lobby.chat.push(payload);
  if (lobby.chat.length > 200) lobby.chat.shift();
  return payload;
}

export function listPublicLobbies(): LobbyState[] {
  return [...lobbies.values()].filter(
    (l) =>
      l.mode === "PUBLIC" &&
      l.status === "WAITING" &&
      seatedPlayers(l).length < l.maxPlayers,
  );
}

export function destroyLobby(id: string) {
  const lobby = lobbies.get(id);
  if (!lobby) return;
  lobbyByCode.delete(lobby.code);
  lobbies.delete(id);
}

export function markLobbyInGame(lobbyId: string, gameId: string) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return null;
  lobby.status = "IN_PROGRESS";
  lobby.gameId = gameId;
  return lobby;
}

export function resetLobbyForRematch(lobbyId: string) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return null;
  lobby.status = "WAITING";
  lobby.gameId = null;
  for (const p of lobby.players) {
    // Bots stay ready for rematch; humans must ready up again
    p.ready = !!(p.isBot || p.username.startsWith("bot_"));
  }
  pushSystem(lobby, "Rematch ready — players must ready up again");
  return lobby;
}

function pushSystem(lobby: LobbyState, content: string) {
  lobby.chat.push({
    id: nanoid(),
    userId: null,
    username: null,
    content,
    isSystem: true,
    isEmoji: false,
    createdAt: Date.now(),
  });
}

export function getAllLobbies() {
  return [...lobbies.values()];
}
