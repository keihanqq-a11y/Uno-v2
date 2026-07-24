import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db/prisma";
import {
  AuthError,
  createSession,
  hashPassword,
  setSessionCookie,
} from "@/lib/auth/session";
import { registerSchema } from "@/lib/auth/validation";
import { sendVerificationEmail } from "@/lib/email/mailer";
import { claimDailyLogin } from "@/lib/rewards";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email.toLowerCase() },
          { username: data.username.toLowerCase() },
        ],
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email or username already in use" },
        { status: 409 },
      );
    }

    const emailVerifyToken = nanoid(32);
    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        username: data.username.toLowerCase(),
        displayName: data.displayName,
        passwordHash,
        emailVerifyToken,
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
      },
    });

    await sendVerificationEmail(user.email, emailVerifyToken);
    const token = await createSession(user.id);
    await setSessionCookie(token);
    await claimDailyLogin(user.id).catch(() => undefined);

    await prisma.analyticsEvent.create({
      data: { type: "user_register", userId: user.id },
    });

    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err && typeof err === "object" && "issues" in err) {
      return NextResponse.json({ error: "Invalid input", details: err }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
