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

export function createLobby(params: {
  hostId: string;
  host: LobbyPlayer;
  maxPlayers: number;
  mode: "PRIVATE" | "PUBLIC";
  allowSpectators: boolean;
}): LobbyState {
  const id = nanoid();
  let code = generateLobbyCode();
  while (lobbyByCode.has(code)) code = generateLobbyCode();

  const lobby: LobbyState = {
    id,
    code,
    hostId: params.hostId,
    mode: params.mode,
    maxPlayers: params.maxPlayers,
    status: "WAITING",
    allowSpectators: params.allowSpectators,
    players: [{ ...params.host, isSpectator: false, ready: false }],
    spectators: [],
    chat: [
      {
        id: nanoid(),
        userId: null,
        username: null,
        content: `${params.host.displayName} created the lobby`,
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
    return { ok: true, lobby };
  }

  if (asSpectator) {
    if (!lobby.allowSpectators) return { ok: false, error: "Spectators not allowed" };
    lobby.spectators.push({ ...player, isSpectator: true, ready: false });
  } else {
    if (lobby.players.length >= lobby.maxPlayers) {
      if (lobby.allowSpectators) {
        lobby.spectators.push({ ...player, isSpectator: true, ready: false });
      } else {
        return { ok: false, error: "Lobby is full" };
      }
    } else {
      lobby.players.push({ ...player, isSpectator: false, ready: false });
    }
  }

  pushSystem(lobby, `${player.displayName} joined`);
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
  if (lobby.players.length >= lobby.maxPlayers) {
    return { ok: false, error: "Lobby is full" };
  }

  lobby.players.push({
    ...bot,
    ready: true,
    connected: true,
    isSpectator: false,
    isBot: true,
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
  if (player) player.ready = ready;
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
    (l) => l.mode === "PUBLIC" && l.status === "WAITING" && l.players.length < l.maxPlayers,
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
