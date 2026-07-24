import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db/prisma";
import { forgotPasswordSchema } from "@/lib/auth/validation";
import { sendPasswordResetEmail } from "@/lib/email/mailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = forgotPasswordSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to avoid account enumeration
    if (user) {
      const resetToken = nanoid(32);
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry },
      });
      await sendPasswordResetEmail(user.email, resetToken);
    }

    return NextResponse.json({
      ok: true,
      message: "If that email exists, a reset link was sent.",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
