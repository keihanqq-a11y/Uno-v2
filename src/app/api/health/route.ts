import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "uno-premium",
    time: new Date().toISOString(),
  });
}
