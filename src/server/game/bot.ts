import {
  canPlayCard,
  getCurrentPlayer,
  getPlayableCards,
  isWild,
} from "@/server/game/engine";
import type { CardColor, GameState, PlayerState, UnoCard } from "@/types/game";

const COLORS: Exclude<CardColor, "wild">[] = ["red", "yellow", "green", "blue"];

export function isBotUserId(userId: string): boolean {
  return userId.startsWith("bot_") || userId.includes("@bot.local");
}

export function isBotPlayer(player: { userId: string; username?: string }): boolean {
  return (
    player.userId.startsWith("bot_") ||
    !!player.username?.startsWith("bot_") ||
    player.userId.includes("bot")
  );
}

/** Count non-wild colors in hand to pick the strongest wild color. */
export function bestColor(hand: UnoCard[]): Exclude<CardColor, "wild"> {
  const counts: Record<string, number> = { red: 0, yellow: 0, green: 0, blue: 0 };
  for (const c of hand) {
    if (c.color !== "wild") counts[c.color] += 1;
  }
  let best: Exclude<CardColor, "wild"> = "red";
  let max = -1;
  for (const color of COLORS) {
    if (counts[color] > max) {
      max = counts[color];
      best = color;
    }
  }
  return best;
}

function scoreCard(card: UnoCard): number {
  // Prefer dumping action cards, save wilds for later
  if (card.value === "wild4") return 1;
  if (card.value === "wild") return 2;
  if (card.value === "draw2") return 8;
  if (card.value === "skip" || card.value === "reverse") return 7;
  return 5;
}

export type BotAction =
  | { type: "play"; cardId: string; chosenColor?: Exclude<CardColor, "wild"> }
  | { type: "draw" }
  | { type: "choose_color"; color: Exclude<CardColor, "wild"> }
  | { type: "call_uno" }
  | { type: "catch_uno"; targetPlayerId: string }
  | { type: "wait" };

/**
 * Decide the next bot action for this game state.
 * Prefer catch UNO, then color choice, then play/draw on turn.
 */
export function decideBotAction(state: GameState, bot: PlayerState): BotAction {
  // Opportunistic catch
  const prey = state.players.find(
    (p) =>
      p.id !== bot.id &&
      p.hand.length === 1 &&
      p.unoVulnerable &&
      !p.calledUno,
  );
  if (prey && Math.random() < 0.75) {
    return { type: "catch_uno", targetPlayerId: prey.id };
  }

  if (state.phase === "choosing_color" && state.pendingColorChooser === bot.id) {
    return { type: "choose_color", color: bestColor(bot.hand) };
  }

  if (state.phase !== "playing") return { type: "wait" };

  const current = getCurrentPlayer(state);
  if (!current || current.id !== bot.id) return { type: "wait" };

  // Call UNO if already at 1 and forgot
  if (bot.hand.length === 1 && !bot.calledUno) {
    return { type: "call_uno" };
  }

  const top = state.discard[state.discard.length - 1];
  if (!top) return { type: "draw" };

  const playable = getPlayableCards(
    bot.hand,
    top,
    state.currentColor,
    state.drawStack,
  ).filter((c) => canPlayCard(c, top, state.currentColor, bot.hand, state.drawStack));

  if (playable.length === 0) {
    return { type: "draw" };
  }

  playable.sort((a, b) => scoreCard(b) - scoreCard(a));
  const card = playable[0];

  if (isWild(card)) {
    return {
      type: "play",
      cardId: card.id,
      chosenColor: bestColor(bot.hand.filter((c) => c.id !== card.id)),
    };
  }

  return { type: "play", cardId: card.id };
}
