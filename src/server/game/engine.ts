import { nanoid } from "nanoid";
import type {
  CardColor,
  CardValue,
  Direction,
  GameState,
  HouseRules,
  PlayerState,
  PublicGameView,
  PublicPlayerView,
  UnoCard,
} from "@/types/game";

const NUMBER_VALUES: CardValue[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const ACTION_VALUES: CardValue[] = ["skip", "reverse", "draw2"];
const COLORS: Exclude<CardColor, "wild">[] = ["red", "yellow", "green", "blue"];

const DEFAULT_RULES: HouseRules = {
  missedUnoPenalty: 5,
  turnTimerSec: 30,
  allowStackDrawTwo: false,
};

/** Cards dealt to each player at game start. */
export const DEAL_HAND_SIZE = 10;
/** Max voluntary draws a player may take in a single turn. */
export const MAX_VOLUNTARY_DRAWS = 5;

/** Build a standard 108-card UNO deck. */
export function createDeck(): UnoCard[] {
  const cards: UnoCard[] = [];

  for (const color of COLORS) {
    cards.push({ id: nanoid(10), color, value: "0" });
    for (let i = 0; i < 2; i++) {
      for (const value of NUMBER_VALUES.slice(1)) {
        cards.push({ id: nanoid(10), color, value });
      }
      for (const value of ACTION_VALUES) {
        cards.push({ id: nanoid(10), color, value });
      }
    }
  }

  for (let i = 0; i < 4; i++) {
    cards.push({ id: nanoid(10), color: "wild", value: "wild" });
    cards.push({ id: nanoid(10), color: "wild", value: "wild4" });
  }

  return cards;
}

/** Fisher–Yates shuffle (in-place, returns same array). */
export function shuffleDeck(deck: UnoCard[], rng: () => number = Math.random): UnoCard[] {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function isWild(card: UnoCard): boolean {
  return card.value === "wild" || card.value === "wild4";
}

export function isActionCard(card: UnoCard): boolean {
  return (
    card.value === "skip" ||
    card.value === "reverse" ||
    card.value === "draw2" ||
    isWild(card)
  );
}

/**
 * A card is playable if it matches the current color or the top discard value,
 * or if it is a wild. Wild Draw Four is only legal when the player has no card
 * matching the current color (standard challenge-free house rule: always allowed
 * for simplicity when `strictWild4` is false).
 */
export function canPlayCard(
  card: UnoCard,
  top: UnoCard,
  currentColor: CardColor,
  hand: UnoCard[],
  drawStack: number,
  strictWild4 = false,
): boolean {
  if (drawStack > 0) {
    // Only Draw Two can be played while a draw stack is pending (if stacking enabled externally).
    return card.value === "draw2" && (card.color === currentColor || top.value === "draw2");
  }

  if (card.value === "wild") return true;

  if (card.value === "wild4") {
    if (!strictWild4) return true;
    return !hand.some(
      (c) => c.id !== card.id && !isWild(c) && c.color === currentColor,
    );
  }

  return card.color === currentColor || card.value === top.value;
}

export function getPlayableCards(
  hand: UnoCard[],
  top: UnoCard,
  currentColor: CardColor,
  drawStack: number,
): UnoCard[] {
  return hand.filter((c) => canPlayCard(c, top, currentColor, hand, drawStack));
}

function activePlayers(state: GameState): PlayerState[] {
  return state.players.filter((p) => !p.isSpectator);
}

function playerCount(state: GameState): number {
  return activePlayers(state).length;
}

function advanceIndex(state: GameState, from: number, steps = 1): number {
  const n = playerCount(state);
  if (n === 0) return 0;
  let idx = from;
  for (let i = 0; i < steps; i++) {
    idx = (idx + state.direction + n) % n;
  }
  return idx;
}

function ensureDeck(state: GameState): void {
  if (state.deck.length > 0) return;
  if (state.discard.length <= 1) return;

  const top = state.discard[state.discard.length - 1];
  const rest = state.discard.slice(0, -1);
  state.discard = [top];
  state.deck = shuffleDeck(rest);
}

function drawFromDeck(state: GameState, count: number): UnoCard[] {
  const drawn: UnoCard[] = [];
  for (let i = 0; i < count; i++) {
    ensureDeck(state);
    const card = state.deck.pop();
    if (!card) break;
    drawn.push(card);
  }
  return drawn;
}

function findPlayerIndex(state: GameState, playerId: string): number {
  return state.players.findIndex((p) => p.id === playerId && !p.isSpectator);
}

function advanceTurn(state: GameState, from: number, steps = 1): void {
  state.currentPlayerIndex = advanceIndex(state, from, steps);
  state.turnStartedAt = Date.now();
  state.voluntaryDrawsThisTurn = 0;
}

function markUnoState(player: PlayerState): void {
  if (player.hand.length === 1) {
    if (!player.calledUno) {
      player.unoVulnerable = true;
    }
  } else {
    player.calledUno = false;
    player.unoVulnerable = false;
  }
}

/**
 * Create a fresh game: shuffle, deal 10, pick starter, reveal first non-wild card.
 */
export function createGame(params: {
  id: string;
  lobbyId: string | null;
  hostId: string;
  players: Array<{
    id: string;
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    seat: number;
  }>;
  rules?: Partial<HouseRules>;
  rng?: () => number;
}): GameState {
  const rules = { ...DEFAULT_RULES, ...params.rules };
  const rng = params.rng ?? Math.random;
  const deck = shuffleDeck(createDeck(), rng);

  const players: PlayerState[] = params.players
    .sort((a, b) => a.seat - b.seat)
    .map((p) => ({
      ...p,
      hand: [],
      connected: true,
      calledUno: false,
      unoVulnerable: false,
      isSpectator: false,
    }));

  // Deal DEAL_HAND_SIZE cards each
  for (let i = 0; i < DEAL_HAND_SIZE; i++) {
    for (const player of players) {
      const card = deck.pop();
      if (card) player.hand.push(card);
    }
  }

  // Reveal first card — reshuffle wilds back into deck until a non-wild4 is found.
  // If first card is wild (color), set a random color; skip/reverse/draw2 apply.
  let first: UnoCard | undefined;
  while (deck.length > 0) {
    first = deck.pop();
    if (!first) break;
    if (first.value === "wild4") {
      deck.unshift(first);
      shuffleDeck(deck, rng);
      continue;
    }
    break;
  }

  if (!first) {
    throw new Error("Unable to deal starting card");
  }

  const discard: UnoCard[] = [first];
  const currentColor: CardColor =
    first.color === "wild" ? COLORS[Math.floor(rng() * 4)] : first.color;
  let direction: Direction = 1;
  let drawStack = 0;
  let startIndex = Math.floor(rng() * players.length);

  // Apply first-card effects relative to the starting player
  if (first.value === "reverse") {
    if (players.length === 2) {
      // Reverse acts like skip in 2P — starting player is skipped, so opponent starts.
      // Keep startIndex as the "dealer's left" equivalent: skip starter.
    } else {
      direction = -1;
    }
  }

  if (first.value === "skip" || (first.value === "reverse" && players.length === 2)) {
    startIndex = (startIndex + 1) % players.length;
  }

  if (first.value === "draw2") {
    drawStack = 2;
  }

  if (first.value === "wild") {
    // Color already randomized; starter plays normally.
  }

  const state: GameState = {
    id: params.id,
    lobbyId: params.lobbyId,
    phase: "playing",
    players,
    spectators: [],
    deck,
    discard,
    currentColor,
    currentPlayerIndex: startIndex,
    direction,
    drawStack,
    pendingColorChooser: null,
    winnerId: null,
    turnStartedAt: Date.now(),
    turnTimerSec: rules.turnTimerSec,
    missedUnoPenalty: rules.missedUnoPenalty,
    voluntaryDrawsThisTurn: 0,
    maxVoluntaryDraws: MAX_VOLUNTARY_DRAWS,
    maxPlayers: players.length,
    hostId: params.hostId,
    startedAt: Date.now(),
    finishedAt: null,
    lastAction: { type: "deal" },
  };

  return state;
}

export function getCurrentPlayer(state: GameState): PlayerState | null {
  const actives = activePlayers(state);
  return actives[state.currentPlayerIndex] ?? null;
}

export function playCard(
  state: GameState,
  playerId: string,
  cardId: string,
  chosenColor?: CardColor,
): { ok: true; state: GameState } | { ok: false; error: string } {
  if (state.phase !== "playing" && state.phase !== "choosing_color") {
    return { ok: false, error: "Game is not in progress" };
  }

  if (state.phase === "choosing_color") {
    return { ok: false, error: "Waiting for color choice" };
  }

  const idx = findPlayerIndex(state, playerId);
  if (idx === -1) return { ok: false, error: "Player not found" };
  if (idx !== state.currentPlayerIndex) return { ok: false, error: "Not your turn" };

  const player = state.players[idx];
  const cardIndex = player.hand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) return { ok: false, error: "Card not in hand" };

  const card = player.hand[cardIndex];
  const top = state.discard[state.discard.length - 1];
  if (!top) return { ok: false, error: "No discard pile" };

  if (!canPlayCard(card, top, state.currentColor, player.hand, state.drawStack)) {
    return { ok: false, error: "Invalid card play" };
  }

  if (isWild(card) && card.value === "wild") {
    if (!chosenColor || chosenColor === "wild") {
      // Defer color choice
      player.hand.splice(cardIndex, 1);
      state.discard.push(card);
      state.pendingColorChooser = playerId;
      state.phase = "choosing_color";
      markUnoState(player);
      state.lastAction = { type: "play", playerId, card };
      checkWin(state, player);
      return { ok: true, state };
    }
  }

  if (card.value === "wild4") {
    if (!chosenColor || chosenColor === "wild") {
      player.hand.splice(cardIndex, 1);
      state.discard.push(card);
      state.pendingColorChooser = playerId;
      state.phase = "choosing_color";
      state.drawStack += 4;
      markUnoState(player);
      state.lastAction = { type: "play", playerId, card };
      checkWin(state, player);
      return { ok: true, state };
    }
  }

  // Commit play
  player.hand.splice(cardIndex, 1);
  state.discard.push(card);

  if (isWild(card) && chosenColor && chosenColor !== "wild") {
    state.currentColor = chosenColor;
  } else if (!isWild(card)) {
    state.currentColor = card.color;
  }

  // Immediate wild4 plays (with a chosen color) still apply the +4 stack.
  // Deferred wild4 already incremented drawStack before returning early.
  if (card.value === "wild4" && chosenColor && chosenColor !== "wild") {
    state.drawStack += 4;
  }

  markUnoState(player);
  state.lastAction = {
    type: "play",
    playerId,
    card,
    chosenColor: isWild(card) ? chosenColor : undefined,
  };

  if (checkWin(state, player)) {
    return { ok: true, state };
  }

  applyCardEffect(state, card, playerId);
  return { ok: true, state };
}

function checkWin(state: GameState, player: PlayerState): boolean {
  if (player.hand.length === 0) {
    state.phase = "finished";
    state.winnerId = player.id;
    state.finishedAt = Date.now();
    state.lastAction = { type: "win", playerId: player.id };
    return true;
  }
  return false;
}

function applyCardEffect(state: GameState, card: UnoCard, playerId: string): void {
  const n = playerCount(state);

  if (card.value === "reverse") {
    if (n === 2) {
      // Reverse acts like Skip in two-player games: opponent is skipped,
      // so advance by 2 and the same player goes again.
      state.lastAction = { type: "reverse", playerId };
      advanceTurn(state, state.currentPlayerIndex, 2);
      return;
    }
    state.direction = (state.direction === 1 ? -1 : 1) as Direction;
    state.lastAction = { type: "reverse", playerId };
    advanceTurn(state, state.currentPlayerIndex, 1);
    return;
  }

  if (card.value === "skip") {
    state.lastAction = { type: "skip", playerId };
    // Skip the next player: advance by 2 from current (who just played)
    advanceTurn(state, state.currentPlayerIndex, 2);
    return;
  }

  if (card.value === "draw2") {
    state.drawStack += 2;
    // Next player will draw (or stack if enabled) — advance turn
    advanceTurn(state, state.currentPlayerIndex, 1);
    return;
  }

  if (card.value === "wild4") {
    // drawStack already incremented when color pending; after color chosen we advance
    advanceTurn(state, state.currentPlayerIndex, 1);
    return;
  }

  // Normal / wild color already set
  advanceTurn(state, state.currentPlayerIndex, 1);
}

export function chooseColor(
  state: GameState,
  playerId: string,
  color: Exclude<CardColor, "wild">,
): { ok: true; state: GameState } | { ok: false; error: string } {
  if (state.phase !== "choosing_color") {
    return { ok: false, error: "Not choosing a color" };
  }
  if (state.pendingColorChooser !== playerId) {
    return { ok: false, error: "Not your color choice" };
  }

  state.currentColor = color;
  state.pendingColorChooser = null;
  state.phase = "playing";
  state.lastAction = { type: "color_choice", playerId, color };

  const player = state.players.find((p) => p.id === playerId);
  if (player && checkWin(state, player)) {
    return { ok: true, state };
  }

  // After wild/wild4 color choice, advance turn (wild4 already added to drawStack)
  advanceTurn(state, findPlayerIndex(state, playerId), 1);
  return { ok: true, state };
}

/**
 * Draw cards. If drawStack > 0, player must take the stack (no play).
 * Otherwise draw 1 (voluntary), up to maxVoluntaryDraws per turn.
 * Keep the turn while draws remain or a playable card was drawn.
 */
export function drawCards(
  state: GameState,
  playerId: string,
  options: { endTurnIfUnplayable?: boolean } = {},
): { ok: true; state: GameState; drawn: UnoCard[] } | { ok: false; error: string } {
  if (state.phase !== "playing") {
    return { ok: false, error: "Game is not in progress" };
  }

  const idx = findPlayerIndex(state, playerId);
  if (idx === -1) return { ok: false, error: "Player not found" };
  if (idx !== state.currentPlayerIndex) return { ok: false, error: "Not your turn" };

  const player = state.players[idx];
  const top = state.discard[state.discard.length - 1];
  if (!top) return { ok: false, error: "No discard pile" };

  const forced = state.drawStack > 0;
  const maxDraws = state.maxVoluntaryDraws || MAX_VOLUNTARY_DRAWS;

  if (!forced) {
    if (state.voluntaryDrawsThisTurn >= maxDraws) {
      return { ok: false, error: `Already drew ${maxDraws} cards this turn` };
    }
    const playable = getPlayableCards(player.hand, top, state.currentColor, 0);
    if (playable.length > 0) {
      return { ok: false, error: "You have playable cards" };
    }
  }

  const count = forced ? state.drawStack : 1;
  const drawn = drawFromDeck(state, count);
  player.hand.push(...drawn);
  const drawnCount = drawn.length;
  state.drawStack = 0;
  if (!forced) {
    state.voluntaryDrawsThisTurn += 1;
  }
  markUnoState(player);
  state.lastAction = { type: "draw", playerId, count: drawnCount };

  const endTurn = options.endTurnIfUnplayable !== false;
  if (endTurn) {
    if (forced || drawnCount === 0) {
      advanceTurn(state, idx, 1);
    } else {
      const playable = getPlayableCards(player.hand, top, state.currentColor, 0);
      if (playable.length === 0 && state.voluntaryDrawsThisTurn >= maxDraws) {
        // Used all voluntary draws and still cannot play — end turn
        advanceTurn(state, idx, 1);
      }
      // else: keep turn to play drawn card or draw again (up to max)
    }
  }

  return { ok: true, state, drawn };
}

export function callUno(
  state: GameState,
  playerId: string,
): { ok: true; state: GameState } | { ok: false; error: string } {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return { ok: false, error: "Player not found" };
  if (player.hand.length !== 1) {
    return { ok: false, error: "UNO can only be called with one card" };
  }

  player.calledUno = true;
  player.unoVulnerable = false;
  state.lastAction = { type: "uno_call", playerId };
  return { ok: true, state };
}

export function catchUno(
  state: GameState,
  catcherId: string,
  targetId: string,
): { ok: true; state: GameState; penalty: number } | { ok: false; error: string } {
  if (catcherId === targetId) {
    return { ok: false, error: "Cannot catch yourself" };
  }

  const catcher = state.players.find((p) => p.id === catcherId);
  const target = state.players.find((p) => p.id === targetId);
  if (!catcher || !target) return { ok: false, error: "Player not found" };
  if (catcher.isSpectator) return { ok: false, error: "Spectators cannot catch UNO" };

  if (target.hand.length !== 1 || !target.unoVulnerable || target.calledUno) {
    return { ok: false, error: "Target is not vulnerable to UNO catch" };
  }

  const penalty = state.missedUnoPenalty;
  const drawn = drawFromDeck(state, penalty);
  target.hand.push(...drawn);
  target.unoVulnerable = false;
  target.calledUno = false;
  markUnoState(target);

  state.lastAction = {
    type: "uno_catch",
    catcherId,
    targetId,
    penalty,
  };

  return { ok: true, state, penalty };
}

/** Auto-draw on turn timeout. */
export function handleTurnTimeout(
  state: GameState,
): { ok: true; state: GameState } | { ok: false; error: string } {
  if (state.phase !== "playing") return { ok: false, error: "Not playing" };
  const current = getCurrentPlayer(state);
  if (!current) return { ok: false, error: "No current player" };

  const result = drawCards(state, current.id, { endTurnIfUnplayable: true });
  if (!result.ok) {
    // Force end turn anyway
    advanceTurn(state, state.currentPlayerIndex, 1);
    state.drawStack = 0;
  } else if (getCurrentPlayer(state)?.id === current.id) {
    // Still their turn after draw (playable card) — force pass on timeout
    advanceTurn(state, findPlayerIndex(state, current.id), 1);
  }

  state.lastAction = { type: "turn_timeout", playerId: current.id };
  return { ok: true, state };
}

export function setPlayerConnected(
  state: GameState,
  playerId: string,
  connected: boolean,
): GameState {
  const player = state.players.find((p) => p.id === playerId);
  if (player) {
    player.connected = connected;
    state.lastAction = {
      type: connected ? "reconnect" : "disconnect",
      playerId,
    };
  }
  const spectator = state.spectators.find((p) => p.id === playerId);
  if (spectator) spectator.connected = connected;
  return state;
}

export function toPublicPlayer(p: PlayerState): PublicPlayerView {
  return {
    id: p.id,
    userId: p.userId,
    username: p.username,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    handCount: p.hand.length,
    seat: p.seat,
    connected: p.connected,
    calledUno: p.calledUno,
    unoVulnerable: p.unoVulnerable,
    isSpectator: p.isSpectator,
  };
}

/** Project full state to a client-safe view for a specific user. */
export function toPublicView(state: GameState, forUserId: string | null): PublicGameView {
  const me =
    state.players.find((p) => p.userId === forUserId) ??
    state.spectators.find((p) => p.userId === forUserId) ??
    null;

  const current = getCurrentPlayer(state);

  return {
    id: state.id,
    lobbyId: state.lobbyId,
    phase: state.phase,
    players: state.players.map(toPublicPlayer),
    spectators: state.spectators.map(toPublicPlayer),
    topCard: state.discard[state.discard.length - 1] ?? null,
    deckCount: state.deck.length,
    currentColor: state.currentColor,
    currentPlayerId: current?.id ?? null,
    direction: state.direction,
    drawStack: state.drawStack,
    pendingColorChooser: state.pendingColorChooser,
    winnerId: state.winnerId,
    turnStartedAt: state.turnStartedAt,
    turnTimerSec: state.turnTimerSec,
    missedUnoPenalty: state.missedUnoPenalty,
    voluntaryDrawsThisTurn: state.voluntaryDrawsThisTurn,
    maxVoluntaryDraws: state.maxVoluntaryDraws,
    maxPlayers: state.maxPlayers,
    hostId: state.hostId,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
    lastAction: state.lastAction,
    myHand: me && !me.isSpectator ? [...me.hand] : [],
    myPlayerId: me?.id ?? null,
  };
}

export function cloneState(state: GameState): GameState {
  return structuredClone(state);
}
