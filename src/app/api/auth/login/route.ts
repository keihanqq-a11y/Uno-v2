import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  createSession,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth/session";
import { loginSchema } from "@/lib/auth/validation";
import { claimDailyLogin } from "@/lib/rewards";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = loginSchema.parse(body);
    const identity = data.emailOrUsername.toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identity }, { username: identity }],
      },
    });

    if (!user || !(await verifyPassword(data.password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.isBanned) {
      return NextResponse.json(
        { error: user.banReason ?? "Account banned" },
        { status: 403 },
      );
    }

    const token = await createSession(user.id);
    await setSessionCookie(token);
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    const daily = await claimDailyLogin(user.id).catch(() => null);

    await prisma.analyticsEvent.create({
      data: { type: "user_login", userId: user.id },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        level: user.level,
        xp: user.xp,
        emailVerified: user.emailVerified,
      },
      dailyReward: daily?.ok ? daily : null,
    });
  } catch (err) {
    if (err && typeof err === "object" && "issues" in err) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
