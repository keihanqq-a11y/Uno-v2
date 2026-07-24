import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const limit = Math.min(50, Number(new URL(req.url).searchParams.get("limit") ?? 20));

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
          },
        },
      },
    });

    return NextResponse.json({ matches });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
