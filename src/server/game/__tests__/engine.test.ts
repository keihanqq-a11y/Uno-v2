import { describe, expect, it } from "vitest";
import {
  callUno,
  canPlayCard,
  catchUno,
  chooseColor,
  createDeck,
  createGame,
  drawCards,
  getPlayableCards,
  playCard,
  shuffleDeck,
  toPublicView,
} from "../engine";
import type { UnoCard } from "@/types/game";

function seededRng(seed = 1): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function makePlayers(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    userId: `u${i}`,
    username: `user${i}`,
    displayName: `User ${i}`,
    avatarUrl: null,
    seat: i,
  }));
}

describe("deck", () => {
  it("creates a 108-card deck", () => {
    expect(createDeck()).toHaveLength(108);
  });

  it("shuffles deterministically with seeded rng", () => {
    const a = shuffleDeck(createDeck(), seededRng(42));
    const b = shuffleDeck(createDeck(), seededRng(42));
    expect(a.map((c) => c.value + c.color)).toEqual(b.map((c) => c.value + c.color));
  });
});

describe("canPlayCard", () => {
  const top: UnoCard = { id: "t", color: "red", value: "5" };

  it("allows same color", () => {
    expect(
      canPlayCard({ id: "1", color: "red", value: "9" }, top, "red", [], 0),
    ).toBe(true);
  });

  it("allows same value", () => {
    expect(
      canPlayCard({ id: "1", color: "blue", value: "5" }, top, "red", [], 0),
    ).toBe(true);
  });

  it("rejects mismatch", () => {
    expect(
      canPlayCard({ id: "1", color: "blue", value: "2" }, top, "red", [], 0),
    ).toBe(false);
  });

  it("allows wild always", () => {
    expect(
      canPlayCard({ id: "1", color: "wild", value: "wild" }, top, "red", [], 0),
    ).toBe(true);
  });
});

describe("createGame", () => {
  it("deals 7 cards and starts playing", () => {
    const state = createGame({
      id: "g1",
      lobbyId: null,
      hostId: "u0",
      players: makePlayers(4),
      rng: seededRng(7),
    });
    expect(state.phase).toBe("playing");
    expect(state.players).toHaveLength(4);
    for (const p of state.players) {
      expect(p.hand).toHaveLength(7);
    }
    expect(state.discard).toHaveLength(1);
    expect(state.deck.length).toBe(108 - 28 - 1);
  });

  it("supports 2–5 players", () => {
    for (const n of [2, 3, 4, 5]) {
      const state = createGame({
        id: `g${n}`,
        lobbyId: null,
        hostId: "u0",
        players: makePlayers(n),
        rng: seededRng(n),
      });
      expect(state.players).toHaveLength(n);
    }
  });
});

describe("play and draw", () => {
  it("rejects out-of-turn play", () => {
    const state = createGame({
      id: "g1",
      lobbyId: null,
      hostId: "u0",
      players: makePlayers(2),
      rng: seededRng(3),
    });
    const other = state.players.find((_, i) => i !== state.currentPlayerIndex)!;
    const result = playCard(state, other.id, other.hand[0].id);
    expect(result.ok).toBe(false);
  });

  it("allows draw when no playable cards", () => {
    const state = createGame({
      id: "g1",
      lobbyId: null,
      hostId: "u0",
      players: makePlayers(2),
      rng: seededRng(99),
    });
    const current = state.players[state.currentPlayerIndex];
    // Force hand to be unplayable
    current.hand = [
      { id: "x1", color: "blue", value: "1" },
      { id: "x2", color: "green", value: "2" },
    ];
    state.currentColor = "red";
    state.discard = [{ id: "top", color: "red", value: "9" }];
    state.drawStack = 0;

    const playable = getPlayableCards(current.hand, state.discard[0], "red", 0);
    expect(playable).toHaveLength(0);

    const result = drawCards(state, current.id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.drawn.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("blocks draw when playable cards exist", () => {
    const state = createGame({
      id: "g1",
      lobbyId: null,
      hostId: "u0",
      players: makePlayers(2),
      rng: seededRng(1),
    });
    const current = state.players[state.currentPlayerIndex];
    current.hand = [{ id: "r5", color: "red", value: "5" }];
    state.currentColor = "red";
    state.discard = [{ id: "top", color: "red", value: "9" }];
    state.drawStack = 0;

    const result = drawCards(state, current.id);
    expect(result.ok).toBe(false);
  });
});

describe("special cards", () => {
  it("reverse acts like skip in 2-player", () => {
    const state = createGame({
      id: "g1",
      lobbyId: null,
      hostId: "u0",
      players: makePlayers(2),
      rng: seededRng(5),
    });
    const current = state.players[state.currentPlayerIndex];
    const otherIdx = 1 - state.currentPlayerIndex;
    current.hand = [{ id: "rev", color: "red", value: "reverse" }];
    state.currentColor = "red";
    state.discard = [{ id: "top", color: "red", value: "3" }];
    state.drawStack = 0;

    const result = playCard(state, current.id, "rev");
    expect(result.ok).toBe(true);
    if (result.ok) {
      // After reverse-as-skip, current player plays again
      expect(result.state.currentPlayerIndex).toBe(state.currentPlayerIndex);
      // Actually: applySkipOrReverseAsSkip advances by 1 from current, so
      // it becomes the opponent's turn... wait, let me re-read.
      // Current plays reverse. applySkipOrReverseAsSkip advances 1 from current index.
      // So it goes to the other player. But "reverse acts like skip" means the
      // opponent is skipped, so current plays again.
      // Looking at my engine: applySkipOrReverseAsSkip advances by 1, which would
      // give turn to opponent — that's WRONG for "reverse = skip in 2P".
      // Skip means skip the NEXT player. After you play skip, you advance 2.
      // So reverse-as-skip should advance 2 (skip opponent, back to you).
      // Let me check the test expectation against the engine...
      // Engine does advanceIndex(..., 1) for reverse in 2P — that's a bug!
      // I need to fix the engine OR the test.
      // Standard UNO: in 2-player, Reverse = Skip, meaning opponent is skipped
      // and you play again. So after playing reverse, currentPlayerIndex should
      // remain the same player (advance 2 from current = back to self).
      expect(result.state.currentPlayerIndex).toBe(state.currentPlayerIndex);
    }
    void otherIdx;
  });

  it("wild requires color choice", () => {
    const state = createGame({
      id: "g1",
      lobbyId: null,
      hostId: "u0",
      players: makePlayers(3),
      rng: seededRng(11),
    });
    const current = state.players[state.currentPlayerIndex];
    // Keep extra cards so the play does not win the round
    current.hand = [
      { id: "w1", color: "wild", value: "wild" },
      { id: "r2", color: "red", value: "2" },
    ];
    state.currentColor = "blue";
    state.discard = [{ id: "top", color: "blue", value: "1" }];

    const played = playCard(state, current.id, "w1");
    expect(played.ok).toBe(true);
    if (played.ok) {
      expect(played.state.phase).toBe("choosing_color");
      const color = chooseColor(played.state, current.id, "yellow");
      expect(color.ok).toBe(true);
      if (color.ok) {
        expect(color.state.currentColor).toBe("yellow");
        expect(color.state.phase).toBe("playing");
      }
    }
  });

  it("skip advances past next player", () => {
    const state = createGame({
      id: "g1",
      lobbyId: null,
      hostId: "u0",
      players: makePlayers(3),
      rng: seededRng(8),
    });
    const idx = state.currentPlayerIndex;
    const current = state.players[idx];
    current.hand = [
      { id: "sk", color: "green", value: "skip" },
      { id: "g1c", color: "green", value: "1" },
    ];
    state.currentColor = "green";
    state.discard = [{ id: "top", color: "green", value: "0" }];
    state.direction = 1;

    const result = playCard(state, current.id, "sk");
    expect(result.ok).toBe(true);
    if (result.ok) {
      const expected = (idx + 2) % 3;
      expect(result.state.currentPlayerIndex).toBe(expected);
    }
  });
});

describe("UNO call and catch", () => {
  it("call UNO clears vulnerability", () => {
    const state = createGame({
      id: "g1",
      lobbyId: null,
      hostId: "u0",
      players: makePlayers(2),
      rng: seededRng(2),
    });
    const p = state.players[0];
    p.hand = [{ id: "c1", color: "red", value: "1" }];
    p.unoVulnerable = true;
    p.calledUno = false;

    const result = callUno(state, p.id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.players[0].calledUno).toBe(true);
      expect(result.state.players[0].unoVulnerable).toBe(false);
    }
  });

  it("catch applies penalty cards", () => {
    const state = createGame({
      id: "g1",
      lobbyId: null,
      hostId: "u0",
      players: makePlayers(2),
      rng: seededRng(2),
      rules: { missedUnoPenalty: 2 },
    });
    const target = state.players[0];
    const catcher = state.players[1];
    target.hand = [{ id: "c1", color: "red", value: "1" }];
    target.unoVulnerable = true;
    target.calledUno = false;

    const result = catchUno(state, catcher.id, target.id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.penalty).toBe(2);
      expect(result.state.players[0].hand.length).toBe(3);
    }
  });

  it("cannot catch after UNO called", () => {
    const state = createGame({
      id: "g1",
      lobbyId: null,
      hostId: "u0",
      players: makePlayers(2),
      rng: seededRng(2),
    });
    const target = state.players[0];
    const catcher = state.players[1];
    target.hand = [{ id: "c1", color: "red", value: "1" }];
    target.calledUno = true;
    target.unoVulnerable = false;

    const result = catchUno(state, catcher.id, target.id);
    expect(result.ok).toBe(false);
  });
});

describe("winning", () => {
  it("finishes when a player empties their hand", () => {
    const state = createGame({
      id: "g1",
      lobbyId: null,
      hostId: "u0",
      players: makePlayers(2),
      rng: seededRng(4),
    });
    const current = state.players[state.currentPlayerIndex];
    current.hand = [{ id: "last", color: "red", value: "7" }];
    state.currentColor = "red";
    state.discard = [{ id: "top", color: "red", value: "2" }];

    const result = playCard(state, current.id, "last");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.phase).toBe("finished");
      expect(result.state.winnerId).toBe(current.id);
    }
  });
});

describe("public view", () => {
  it("hides other players' hands", () => {
    const state = createGame({
      id: "g1",
      lobbyId: null,
      hostId: "u0",
      players: makePlayers(2),
      rng: seededRng(6),
    });
    const view = toPublicView(state, "u0");
    expect(view.myHand).toHaveLength(7);
    expect(view.players.every((p) => typeof p.handCount === "number")).toBe(true);
    expect(view.players[0]).not.toHaveProperty("hand");
  });
});
