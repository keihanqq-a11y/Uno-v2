/** Core UNO card and game state types — shared by engine and client views. */

export type CardColor = "red" | "yellow" | "green" | "blue" | "wild";

export type CardValue =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "skip"
  | "reverse"
  | "draw2"
  | "wild"
  | "wild4";

export interface UnoCard {
  id: string;
  color: CardColor;
  value: CardValue;
}

export type Direction = 1 | -1;

export type GamePhase =
  | "waiting"
  | "playing"
  | "choosing_color"
  | "finished";

export interface PlayerState {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  hand: UnoCard[];
  seat: number;
  connected: boolean;
  calledUno: boolean;
  /** True when player has 1 card and has not called UNO yet (catchable). */
  unoVulnerable: boolean;
  isSpectator: boolean;
}

export interface PublicPlayerView {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  handCount: number;
  seat: number;
  connected: boolean;
  calledUno: boolean;
  unoVulnerable: boolean;
  isSpectator: boolean;
}

export interface GameState {
  id: string;
  lobbyId: string | null;
  phase: GamePhase;
  players: PlayerState[];
  spectators: PlayerState[];
  deck: UnoCard[];
  discard: UnoCard[];
  currentColor: CardColor;
  currentPlayerIndex: number;
  direction: Direction;
  drawStack: number;
  /** Player who must choose a color after playing wild. */
  pendingColorChooser: string | null;
  winnerId: string | null;
  turnStartedAt: number;
  turnTimerSec: number;
  missedUnoPenalty: number;
  maxPlayers: number;
  hostId: string;
  startedAt: number | null;
  finishedAt: number | null;
  lastAction: GameActionLog | null;
}

export interface PublicGameView {
  id: string;
  lobbyId: string | null;
  phase: GamePhase;
  players: PublicPlayerView[];
  spectators: PublicPlayerView[];
  topCard: UnoCard | null;
  deckCount: number;
  currentColor: CardColor;
  currentPlayerId: string | null;
  direction: Direction;
  drawStack: number;
  pendingColorChooser: string | null;
  winnerId: string | null;
  turnStartedAt: number;
  turnTimerSec: number;
  missedUnoPenalty: number;
  maxPlayers: number;
  hostId: string;
  startedAt: number | null;
  finishedAt: number | null;
  lastAction: GameActionLog | null;
  /** Only the requesting player's full hand. */
  myHand: UnoCard[];
  myPlayerId: string | null;
}

export type GameActionLog =
  | { type: "play"; playerId: string; card: UnoCard; chosenColor?: CardColor }
  | { type: "draw"; playerId: string; count: number }
  | { type: "skip"; playerId: string }
  | { type: "reverse"; playerId: string }
  | { type: "uno_call"; playerId: string }
  | { type: "uno_catch"; catcherId: string; targetId: string; penalty: number }
  | { type: "color_choice"; playerId: string; color: CardColor }
  | { type: "win"; playerId: string }
  | { type: "turn_timeout"; playerId: string }
  | { type: "deal" }
  | { type: "reconnect"; playerId: string }
  | { type: "disconnect"; playerId: string };

export interface LobbyState {
  id: string;
  code: string;
  hostId: string;
  mode: "PRIVATE" | "PUBLIC";
  maxPlayers: number;
  status: "WAITING" | "IN_PROGRESS" | "FINISHED" | "ABANDONED";
  allowSpectators: boolean;
  players: LobbyPlayer[];
  spectators: LobbyPlayer[];
  chat: ChatMessagePayload[];
  gameId: string | null;
  createdAt: number;
}

export interface LobbyPlayer {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  ready: boolean;
  connected: boolean;
  isSpectator: boolean;
  isBot?: boolean;
}

export interface ChatMessagePayload {
  id: string;
  userId: string | null;
  username: string | null;
  content: string;
  isSystem: boolean;
  isEmoji: boolean;
  createdAt: number;
}

export type PlayCardResult =
  | { ok: true; state: GameState }
  | { ok: false; error: string };

export interface HouseRules {
  missedUnoPenalty: number;
  turnTimerSec: number;
  allowStackDrawTwo: boolean;
}
