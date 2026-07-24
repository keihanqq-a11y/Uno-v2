import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db/prisma";
import {
  createSession,
  getCurrentUser,
  hashPassword,
  setSessionCookie,
} from "@/lib/auth/session";

/** Creates (or reuses) a guest session so the app works without login. */
export async function POST() {
  try {
    const existing = await getCurrentUser();
    if (existing) {
      return NextResponse.json({
        user: existing,
        guest: existing.email.endsWith("@guest.local"),
      });
    }

    const suffix = nanoid(6).toLowerCase();
    const username = `guest_${suffix}`;
    const passwordHash = await hashPassword(nanoid(24));

    const user = await prisma.user.create({
      data: {
        email: `${username}@guest.local`,
        username,
        displayName: `Guest ${suffix.toUpperCase()}`,
        passwordHash,
        emailVerified: true,
        role: "USER",
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        level: true,
        xp: true,
        emailVerified: true,
        balanceUsd: true,
      },
    });

    const token = await createSession(user.id);
    await setSessionCookie(token);

    return NextResponse.json({
      user: { ...user, balanceUsd: user.balanceUsd ?? 0 },
      guest: true,
    });
  } catch (err) {
    console.error("[guest]", err);
    return NextResponse.json(
      {
        error:
          "Database not ready. Run: npx prisma db push && npm run db:seed",
      },
      { status: 500 },
    );
  }
}
