import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { winRate } from "@/lib/utils";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sort = searchParams.get("sort") ?? "wins";
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 25)));

  const orderBy =
    sort === "xp"
      ? { xp: "desc" as const }
      : sort === "level"
        ? { level: "desc" as const }
        : sort === "games"
          ? { gamesPlayed: "desc" as const }
          : { wins: "desc" as const };

  const users = await prisma.user.findMany({
    where: { isBanned: false, gamesPlayed: { gt: 0 } },
    orderBy,
    take: limit,
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      level: true,
      xp: true,
      wins: true,
      losses: true,
      gamesPlayed: true,
    },
  });

  const board = users
    .map((u) => ({
      ...u,
      winRate: winRate(u.wins, u.gamesPlayed),
    }))
    .sort((a, b) => {
      if (sort === "winrate") return b.winRate - a.winRate || b.wins - a.wins;
      return 0;
    });

  return NextResponse.json({ leaderboard: board, sort });
}
