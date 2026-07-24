import { NextResponse } from "next/server";
import { WALLET_ASSETS } from "@/lib/wallet/assets";

export type RatesMap = Record<string, number>;

/** Live USD prices via CoinGecko (cached briefly in-memory). */
let cache: { at: number; rates: RatesMap } | null = null;
const TTL_MS = 60_000;

const FALLBACK: RatesMap = {
  SOL: 145,
  USDT: 1,
  USDC: 1,
  ETH: 3200,
  LTC: 85,
  BTC: 95000,
};

export async function GET() {
  try {
    if (cache && Date.now() - cache.at < TTL_MS) {
      return NextResponse.json({ rates: cache.rates, source: "cache" });
    }

    const ids = WALLET_ASSETS.map((a) => a.coingeckoId).join(",");
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
    const res = await fetch(url, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json({ rates: FALLBACK, source: "fallback" });
    }

    const data = (await res.json()) as Record<string, { usd?: number }>;
    const rates: RatesMap = { ...FALLBACK };

    for (const asset of WALLET_ASSETS) {
      const usd = data[asset.coingeckoId]?.usd;
      if (typeof usd === "number" && usd > 0) {
        rates[asset.id] = usd;
      }
    }

    cache = { at: Date.now(), rates };
    return NextResponse.json({ rates, source: "live" });
  } catch {
    return NextResponse.json({ rates: FALLBACK, source: "fallback" });
  }
}
