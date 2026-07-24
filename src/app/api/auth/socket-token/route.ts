import { NextResponse } from "next/server";
import { getCurrentUser, getSessionToken } from "@/lib/auth/session";

/** Returns the session token so the socket client can auth explicitly. */
export async function GET() {
  const user = await getCurrentUser();
  const token = await getSessionToken();
  if (!user || !token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ token, userId: user.id });
}
