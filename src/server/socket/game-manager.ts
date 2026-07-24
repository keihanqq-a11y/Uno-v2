import { nanoid } from "nanoid";
import {
  callUno,
  catchUno,
  chooseColor,
  createGame,
  drawCards,
  handleTurnTimeout,
  playCard,
  setPlayerConnected,
  toPublicView,
} from "@/server/game/engine";
import type { CardColor, ChatMessagePayload, GameState, PublicGameView } from "@/types/game";
import { sanitizeChat } from "@/lib/utils";

interface ManagedGame {
  state: GameState;
  chat: ChatMessagePayload[];
  turnTimer: ReturnType<typeof setTimeout> | null;
  onStateChange?: (state: GameState) => void;
}

const games = new Map<string, ManagedGame>();
const userToGame = new Map<string, string>();

export function getGame(id: string): ManagedGame | undefined {
  return games.get(id);
}

export function getGameByUser(userId: string): ManagedGame | undefined {
  const id = userToGame.get(userId);
  return id ? games.get(id) : undefined;
}

export function startGame(params: {
  lobbyId: string | null;
  hostId: string;
  players: Array<{
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  }>;
  maxPlayers: number;
  onStateChange?: (state: GameState) => void;
}): GameState {
  const id = nanoid();
  const penalty = Number(process.env.HOUSE_RULE_MISSED_UNO_PENALTY ?? 2);
  const turnTimerSec = Number(process.env.TURN_TIMER_SECONDS ?? 30);

  const state = createGame({
    id,
    lobbyId: params.lobbyId,
    hostId: params.hostId,
    players: params.players.map((p, seat) => ({
      id: nanoid(8),
      userId: p.userId,
      username: p.username,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      seat,
    })),
    rules: { missedUnoPenalty: penalty, turnTimerSec },
  });

  const managed: ManagedGame = {
    state,
    chat: [],
    turnTimer: null,
    onStateChange: params.onStateChange,
  };

  games.set(id, managed);
  for (const p of state.players) {
    userToGame.set(p.userId, id);
  }

  armTurnTimer(id);
  return state;
}

function emitChange(id: string) {
  const g = games.get(id);
  if (g?.onStateChange) g.onStateChange(g.state);
}

function armTurnTimer(gameId: string) {
  const g = games.get(gameId);
  if (!g) return;
  if (g.turnTimer) clearTimeout(g.turnTimer);
  if (g.state.phase !== "playing") return;

  g.turnTimer = setTimeout(() => {
    const current = games.get(gameId);
    if (!current || current.state.phase !== "playing") return;
    handleTurnTimeout(current.state);
    emitChange(gameId);
    armTurnTimer(gameId);
  }, g.state.turnTimerSec * 1000);
}

export function viewFor(gameId: string, userId: string | null): PublicGameView | null {
  const g = games.get(gameId);
  if (!g) return null;
  return toPublicView(g.state, userId);
}

export function applyPlay(
  gameId: string,
  userId: string,
  cardId: string,
  chosenColor?: CardColor,
) {
  const g = games.get(gameId);
  if (!g) return { ok: false as const, error: "Game not found" };
  const player = g.state.players.find((p) => p.userId === userId);
  if (!player) return { ok: false as const, error: "Not in game" };

  const result = playCard(g.state, player.id, cardId, chosenColor);
  if (!result.ok) return result;

  g.state = result.state;
  emitChange(gameId);
  armTurnTimer(gameId);
  return { ok: true as const, state: g.state };
}

export function applyDraw(gameId: string, userId: string) {
  const g = games.get(gameId);
  if (!g) return { ok: false as const, error: "Game not found" };
  const player = g.state.players.find((p) => p.userId === userId);
  if (!player) return { ok: false as const, error: "Not in game" };

  const result = drawCards(g.state, player.id);
  if (!result.ok) return result;

  g.state = result.state;
  emitChange(gameId);
  armTurnTimer(gameId);
  return { ok: true as const, state: g.state, drawn: result.drawn };
}

export function applyChooseColor(
  gameId: string,
  userId: string,
  color: Exclude<CardColor, "wild">,
) {
  const g = games.get(gameId);
  if (!g) return { ok: false as const, error: "Game not found" };
  const player = g.state.players.find((p) => p.userId === userId);
  if (!player) return { ok: false as const, error: "Not in game" };

  const result = chooseColor(g.state, player.id, color);
  if (!result.ok) return result;

  g.state = result.state;
  emitChange(gameId);
  armTurnTimer(gameId);
  return { ok: true as const, state: g.state };
}

export function applyCallUno(gameId: string, userId: string) {
  const g = games.get(gameId);
  if (!g) return { ok: false as const, error: "Game not found" };
  const player = g.state.players.find((p) => p.userId === userId);
  if (!player) return { ok: false as const, error: "Not in game" };

  const result = callUno(g.state, player.id);
  if (!result.ok) return result;
  g.state = result.state;
  emitChange(gameId);
  return { ok: true as const, state: g.state };
}

export function applyCatchUno(gameId: string, catcherUserId: string, targetPlayerId: string) {
  const g = games.get(gameId);
  if (!g) return { ok: false as const, error: "Game not found" };
  const catcher = g.state.players.find((p) => p.userId === catcherUserId);
  if (!catcher) return { ok: false as const, error: "Not in game" };

  const result = catchUno(g.state, catcher.id, targetPlayerId);
  if (!result.ok) return result;
  g.state = result.state;
  emitChange(gameId);
  return { ok: true as const, state: g.state, penalty: result.penalty };
}

export function reconnectPlayer(gameId: string, userId: string) {
  const g = games.get(gameId);
  if (!g) return null;
  const player = g.state.players.find((p) => p.userId === userId);
  if (!player) {
    const spec = g.state.spectators.find((p) => p.userId === userId);
    if (spec) {
      setPlayerConnected(g.state, spec.id, true);
      userToGame.set(userId, gameId);
      emitChange(gameId);
    }
    return g.state;
  }
  setPlayerConnected(g.state, player.id, true);
  userToGame.set(userId, gameId);
  emitChange(gameId);
  return g.state;
}

export function disconnectPlayer(userId: string) {
  const gameId = userToGame.get(userId);
  if (!gameId) return null;
  const g = games.get(gameId);
  if (!g) return null;
  const player = g.state.players.find((p) => p.userId === userId);
  if (player) {
    setPlayerConnected(g.state, player.id, false);
    emitChange(gameId);
  }
  return g.state;
}

export function addGameChat(
  gameId: string,
  msg: Omit<ChatMessagePayload, "id" | "createdAt">,
) {
  const g = games.get(gameId);
  if (!g) return null;
  const payload: ChatMessagePayload = {
    ...msg,
    content: sanitizeChat(msg.content),
    id: nanoid(),
    createdAt: Date.now(),
  };
  g.chat.push(payload);
  if (g.chat.length > 200) g.chat.shift();
  return payload;
}

export function endAndCleanup(gameId: string) {
  const g = games.get(gameId);
  if (!g) return;
  if (g.turnTimer) clearTimeout(g.turnTimer);
  for (const p of g.state.players) userToGame.delete(p.userId);
  for (const p of g.state.spectators) userToGame.delete(p.userId);
  games.delete(gameId);
}

export function getAllGames() {
  return [...games.values()].map((g) => g.state);
}
