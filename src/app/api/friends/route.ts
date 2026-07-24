import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await requireUser();
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ userAId: user.id }, { userBId: user.id }],
        status: { in: ["PENDING", "ACCEPTED"] },
      },
      include: {
        userA: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            level: true,
          },
        },
        userB: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            level: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const friends = friendships.map((f) => {
      const other = f.userAId === user.id ? f.userB : f.userA;
      return {
        id: f.id,
        status: f.status,
        incoming: f.userBId === user.id && f.status === "PENDING",
        user: other,
      };
    });

    return NextResponse.json({ friends });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const username = String(body?.username ?? "").toLowerCase();
    if (!username) {
      return NextResponse.json({ error: "Username required" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { username } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (target.id === user.id) {
      return NextResponse.json({ error: "Cannot friend yourself" }, { status: 400 });
    }

    const [a, b] = [user.id, target.id].sort();
    const existing = await prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId: a, userBId: b } },
    });
    if (existing) {
      return NextResponse.json({ error: "Friendship already exists" }, { status: 409 });
    }

    // Store requester as userA conceptually via direction: we always sort IDs
    // but track initiator by putting initiator first when creating pending.
    const friendship = await prisma.friendship.create({
      data: {
        userAId: user.id,
        userBId: target.id,
        status: "PENDING",
      },
    });

    await prisma.notification.create({
      data: {
        userId: target.id,
        title: "Friend request",
        body: `${user.displayName} sent you a friend request`,
        href: "/friends",
      },
    });

    return NextResponse.json({ friendship });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const id = String(body?.id ?? "");
    const action = String(body?.action ?? "");

    const friendship = await prisma.friendship.findUnique({ where: { id } });
    if (!friendship) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (action === "accept") {
      if (friendship.userBId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const updated = await prisma.friendship.update({
        where: { id },
        data: { status: "ACCEPTED" },
      });
      return NextResponse.json({ friendship: updated });
    }

    if (action === "decline" || action === "remove") {
      if (friendship.userAId !== user.id && friendship.userBId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await prisma.friendship.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
