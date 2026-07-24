import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/auth/session";
import { processWithdraw } from "@/lib/wallet/ledger";
import type { WalletAssetId } from "@/lib/wallet/assets";
import { WALLET_ASSETS } from "@/lib/wallet/assets";

const ASSET_IDS = new Set(WALLET_ASSETS.map((a) => a.id));

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as {
      amountUsd?: number;
      assetId?: string;
      destinationAddress?: string;
    };

    const assetId = body.assetId as WalletAssetId;
    if (!ASSET_IDS.has(assetId)) {
      return NextResponse.json({ error: "Invalid asset" }, { status: 400 });
    }

    const result = await processWithdraw({
      userId: user.id,
      amountUsd: Number(body.amountUsd),
      assetId,
      destinationAddress: String(body.destinationAddress ?? ""),
    });

    return NextResponse.json({
      ok: true,
      balanceUsd: result.balanceUsd,
      txId: result.txId,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Withdraw failed" }, { status: 500 });
  }
}
