import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { getAllGames } from "@/server/socket/game-manager";
import { getAllLobbies } from "@/server/socket/lobby-manager";

export async function GET() {
  try {
    await requireAdmin();
    const recent = await prisma.game.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        players: {
          include: {
            user: { select: { username: true, displayName: true } },
          },
        },
      },
    });

    return NextResponse.json({
      liveGames: getAllGames().map((g) => ({
        id: g.id,
        phase: g.phase,
        players: g.players.length,
        startedAt: g.startedAt,
      })),
      liveLobbies: getAllLobbies().map((l) => ({
        id: l.id,
        code: l.code,
        status: l.status,
        players: l.players.length,
        maxPlayers: l.maxPlayers,
        mode: l.mode,
      })),
      recent,
    });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
