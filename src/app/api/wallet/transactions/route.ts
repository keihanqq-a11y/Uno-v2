import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { explorerAccountUrl, explorerTxUrl, shortenAddress } from "@/lib/wallet/assets";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const limit = Math.min(100, Number(new URL(req.url).searchParams.get("limit") ?? 40));

    const rows = await prisma.walletTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const transactions = rows.map((t) => ({
      id: t.id,
      type: t.type,
      status: t.status,
      amountUsd: t.amountUsd,
      assetId: t.assetId,
      assetSymbol: t.assetSymbol,
      cryptoAmount: t.cryptoAmount,
      address: t.address,
      addressShort: t.address ? shortenAddress(t.address) : null,
      txSignature: t.txSignature,
      note: t.note,
      balanceAfterUsd: t.balanceAfterUsd,
      createdAt: t.createdAt,
      explorerAccountUrl: explorerAccountUrl(t.assetId, t.address),
      // Prefer Solscan / explorer account for demo wallet sends
      explorerTxUrl:
        t.assetId === "SOL"
          ? explorerAccountUrl(t.assetId, t.address)
          : explorerTxUrl(t.assetId, t.txSignature) ?? explorerAccountUrl(t.assetId, t.address),
    }));

    return NextResponse.json({ transactions });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
