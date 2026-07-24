import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin, requireUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await requireUser();
    if (user.role === "ADMIN" || user.role === "MODERATOR") {
      const tickets = await prisma.supportTicket.findMany({
        orderBy: { updatedAt: "desc" },
        take: 100,
        include: {
          user: { select: { username: true, displayName: true } },
          messages: { orderBy: { createdAt: "asc" }, take: 50 },
        },
      });
      return NextResponse.json({ tickets });
    }

    const tickets = await prisma.supportTicket.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    return NextResponse.json({ tickets });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const subject = String(body?.subject ?? "").slice(0, 120);
    const content = String(body?.content ?? "").slice(0, 2000);
    if (!subject || !content) {
      return NextResponse.json({ error: "Subject and message required" }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user.id,
        subject,
        messages: {
          create: { userId: user.id, content, isStaff: false },
        },
      },
      include: { messages: true },
    });
    return NextResponse.json({ ticket });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const id = String(body?.id ?? "");

    if (body?.message) {
      const message = await prisma.ticketMessage.create({
        data: {
          ticketId: id,
          userId: admin.id,
          content: String(body.message).slice(0, 2000),
          isStaff: true,
        },
      });
      await prisma.supportTicket.update({
        where: { id },
        data: { status: "IN_PROGRESS" },
      });
      return NextResponse.json({ message });
    }

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: { status: body?.status ?? "RESOLVED" },
    });
    return NextResponse.json({ ticket });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
