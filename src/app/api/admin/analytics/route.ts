import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/session";

export async function GET() {
  try {
    await requireAdmin();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [users, games, events, activeUsers] = await Promise.all([
      prisma.user.count(),
      prisma.game.count({ where: { status: "FINISHED" } }),
      prisma.analyticsEvent.groupBy({
        by: ["type"],
        where: { createdAt: { gte: since } },
        _count: true,
      }),
      prisma.user.count({ where: { lastLoginAt: { gte: since } } }),
    ]);

    return NextResponse.json({
      totals: { users, games, activeUsers },
      events: events.map((e) => ({ type: e.type, count: e._count })),
    });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
