import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/session";

export async function GET() {
  try {
    await requireAdmin();
    const messages = await prisma.chatMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { username: true, displayName: true, id: true } },
      },
    });
    const moderated = await prisma.moderatedMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ messages, moderated });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const moderated = await prisma.moderatedMessage.create({
      data: {
        messageId: String(body?.messageId ?? "unknown"),
        content: String(body?.content ?? "").slice(0, 500),
        reason: String(body?.reason ?? "policy"),
        action: String(body?.action ?? "delete"),
        staffId: admin.id,
      },
    });

    if (body?.messageId) {
      await prisma.chatMessage.deleteMany({ where: { id: String(body.messageId) } });
    }

    return NextResponse.json({ moderated });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
