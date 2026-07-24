import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/session";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const q = new URL(req.url).searchParams.get("q")?.toLowerCase() ?? "";
    const users = await prisma.user.findMany({
      where: q
        ? {
            OR: [
              { username: { contains: q } },
              { email: { contains: q } },
              { displayName: { contains: q } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        level: true,
        wins: true,
        gamesPlayed: true,
        isBanned: true,
        banReason: true,
        createdAt: true,
        emailVerified: true,
      },
    });
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const id = String(body?.id ?? "");
    const action = String(body?.action ?? "");

    if (action === "ban") {
      const user = await prisma.user.update({
        where: { id },
        data: { isBanned: true, banReason: String(body?.reason ?? "Banned by admin") },
      });
      await prisma.session.deleteMany({ where: { userId: id } });
      return NextResponse.json({ user });
    }
    if (action === "unban") {
      const user = await prisma.user.update({
        where: { id },
        data: { isBanned: false, banReason: null },
      });
      return NextResponse.json({ user });
    }
    if (action === "role") {
      const role = body?.role === "ADMIN" || body?.role === "MODERATOR" ? body.role : "USER";
      const user = await prisma.user.update({ where: { id }, data: { role } });
      return NextResponse.json({ user });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
