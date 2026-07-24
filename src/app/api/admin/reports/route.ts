import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/session";

export async function GET() {
  try {
    await requireAdmin();
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        reporter: { select: { username: true, displayName: true } },
        reported: { select: { username: true, displayName: true, id: true } },
      },
    });
    return NextResponse.json({ reports });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const report = await prisma.report.update({
      where: { id: String(body?.id) },
      data: {
        status: body?.status ?? "REVIEWED",
        resolvedAt: ["ACTIONED", "DISMISSED", "REVIEWED"].includes(body?.status)
          ? new Date()
          : undefined,
      },
    });
    return NextResponse.json({ report });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function POST(req: Request) {
  try {
    const { requireUser } = await import("@/lib/auth/session");
    const user = await requireUser();
    const body = await req.json();
    const report = await prisma.report.create({
      data: {
        reporterId: user.id,
        reportedId: String(body?.reportedId),
        reason: String(body?.reason ?? "abuse"),
        details: body?.details ? String(body.details).slice(0, 1000) : null,
      },
    });
    return NextResponse.json({ report });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }
}
