import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const limit = Math.min(50, Number(new URL(req.url).searchParams.get("limit") ?? 30));

    const matches = await prisma.matchHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        game: {
          select: {
            id: true,
            playerCount: true,
            winnerId: true,
            endedAt: true,
            startedAt: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({
      matches: matches.map((m) => ({
        id: m.id,
        won: m.won,
        placement: m.placement,
        playerCount: m.playerCount,
        cardsLeft: m.cardsLeft,
        xpEarned: m.xpEarned,
        lobbyCode: m.lobbyCode,
        stakeUsd: m.stakeUsd,
        createdAt: m.createdAt,
        gameId: m.gameId,
        game: m.game,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
