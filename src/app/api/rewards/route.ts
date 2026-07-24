import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { claimDailyLogin } from "@/lib/rewards";
import { xpForLevel } from "@/lib/utils";

export async function GET() {
  try {
    const user = await requireUser();
    const full = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        achievements: { include: { achievement: true } },
        badges: { include: { badge: true } },
      },
    });
    if (!full) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const allAchievements = await prisma.achievement.findMany();
    return NextResponse.json({
      xp: full.xp,
      level: full.level,
      nextLevelXp: xpForLevel(full.level + 1),
      loginStreak: full.loginStreak,
      lastDailyRewardAt: full.lastDailyRewardAt,
      achievements: full.achievements,
      badges: full.badges,
      catalog: allAchievements,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST() {
  try {
    const user = await requireUser();
    const result = await claimDailyLogin(user.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
