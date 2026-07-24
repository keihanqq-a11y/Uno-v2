import { describe, expect, it } from "vitest";
import { bestColor, decideBotAction } from "../bot";
import { createGame } from "../engine";
import type { UnoCard } from "@/types/game";

function seededRng(seed = 1): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe("bot AI", () => {
  it("picks the most common color", () => {
    const hand: UnoCard[] = [
      { id: "1", color: "red", value: "1" },
      { id: "2", color: "red", value: "3" },
      { id: "3", color: "blue", value: "5" },
    ];
    expect(bestColor(hand)).toBe("red");
  });

  it("plays a card or draws on its turn", () => {
    const state = createGame({
      id: "g1",
      lobbyId: null,
      hostId: "u0",
      players: [
        {
          id: "p0",
          userId: "human",
          username: "human",
          displayName: "Human",
          avatarUrl: null,
          seat: 0,
        },
        {
          id: "p1",
          userId: "bot1",
          username: "bot_alpha",
          displayName: "Bot Alpha",
          avatarUrl: null,
          seat: 1,
        },
      ],
      rng: seededRng(3),
    });

    // Force bot's turn with a known hand
    state.currentPlayerIndex = 1;
    const bot = state.players[1];
    bot.hand = [
      { id: "r1", color: "red", value: "1" },
      { id: "b2", color: "blue", value: "2" },
    ];
    state.currentColor = "red";
    state.discard = [{ id: "top", color: "red", value: "9" }];
    state.drawStack = 0;
    state.phase = "playing";

    const action = decideBotAction(state, bot);
    expect(["play", "draw", "call_uno", "catch_uno"]).toContain(action.type);
    if (action.type === "play") {
      expect(action.cardId).toBe("r1");
    }
  });
});
