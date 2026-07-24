import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { profileUpdateSchema } from "@/lib/auth/validation";
import { winRate } from "@/lib/utils";

export async function GET(req: Request) {
  const username = new URL(req.url).searchParams.get("username");
  if (!username) {
    return NextResponse.json({ error: "username required" }, { status: 400 });
  }

  const profile = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      level: true,
      xp: true,
      wins: true,
      losses: true,
      gamesPlayed: true,
      loginStreak: true,
      createdAt: true,
      achievements: { include: { achievement: true } },
      badges: { include: { badge: true } },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    profile: {
      ...profile,
      winRate: winRate(profile.wins, profile.gamesPlayed),
    },
  });
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = profileUpdateSchema.parse(body);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        displayName: data.displayName,
        bio: data.bio,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
      },
    });

    return NextResponse.json({ user: updated });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 400 });
  }
}
