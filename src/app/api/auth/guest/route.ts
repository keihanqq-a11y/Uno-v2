import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db/prisma";
import {
  createSession,
  getCurrentUser,
  hashPassword,
  setSessionCookie,
} from "@/lib/auth/session";

const userSelect = {
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
  guestKey: true,
} as const;

function asClientUser(user: {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  level: number;
  xp: number;
  emailVerified: boolean;
  balanceUsd: number | null;
  guestKey?: string | null;
}) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    level: user.level,
    xp: user.xp,
    emailVerified: user.emailVerified,
    balanceUsd: user.balanceUsd ?? 0,
    guestKey: user.guestKey ?? null,
  };
}

/** Creates or reclaims a guest session so the same player persists across visits. */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { guestKey?: string };
    const guestKey =
      typeof body.guestKey === "string" && body.guestKey.length >= 8
        ? body.guestKey.trim()
        : null;

    const existing = await getCurrentUser();
    if (existing) {
      // Ensure returning guests get a stable reclaim key on the client.
      let key = guestKey;
      const dbUser = await prisma.user.findUnique({
        where: { id: existing.id },
        select: { guestKey: true, email: true },
      });
      if (dbUser?.email.endsWith("@guest.local")) {
        if (!dbUser.guestKey) {
          key = nanoid(32);
          await prisma.user.update({
            where: { id: existing.id },
            data: { guestKey: key },
          });
        } else {
          key = dbUser.guestKey;
        }
      }
      return NextResponse.json({
        user: { ...existing, guestKey: key },
        guest: existing.email.endsWith("@guest.local"),
      });
    }

    // Reclaim previous guest account from browser-stored key
    if (guestKey) {
      const reclaimed = await prisma.user.findUnique({
        where: { guestKey },
        select: userSelect,
      });
      if (reclaimed && !reclaimed.email.includes("bot") && reclaimed.email.endsWith("@guest.local")) {
        const token = await createSession(reclaimed.id);
        await setSessionCookie(token);
        return NextResponse.json({
          user: asClientUser(reclaimed),
          guest: true,
          reclaimed: true,
        });
      }
    }

    const suffix = nanoid(6).toLowerCase();
    const username = `guest_${suffix}`;
    const passwordHash = await hashPassword(nanoid(24));
    const newKey = nanoid(32);

    const user = await prisma.user.create({
      data: {
        email: `${username}@guest.local`,
        username,
        displayName: `Guest ${suffix.toUpperCase()}`,
        passwordHash,
        emailVerified: true,
        role: "USER",
        guestKey: newKey,
      },
      select: userSelect,
    });

    const token = await createSession(user.id);
    await setSessionCookie(token);

    return NextResponse.json({
      user: asClientUser(user),
      guest: true,
    });
  } catch (err) {
    console.error("[guest]", err);
    const detail =
      err instanceof Error ? err.message : "Unknown database error";
    const needsSchema =
      detail.includes("balanceUsd") ||
      detail.includes("guestKey") ||
      detail.includes("Unknown field") ||
      detail.includes("does not exist") ||
      detail.includes("P2021") ||
      detail.includes("P2022");
    return NextResponse.json(
      {
        error: needsSchema
          ? "Database schema outdated. Stop the server (Ctrl+C), run: npm run setup — then npm run dev again."
          : `Database not ready. Stop the server (Ctrl+C), run: npm run setup — then npm run dev again. (${detail.slice(0, 120)})`,
      },
      { status: 500 },
    );
  }
}
