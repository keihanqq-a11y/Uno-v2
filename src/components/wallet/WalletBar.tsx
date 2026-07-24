"use client";

import { useEffect, useState } from "react";
import { WalletModal } from "@/components/wallet/WalletModal";
import { CryptoLogo } from "@/components/wallet/CryptoLogo";
import { WALLET_ASSETS, getAsset, type WalletAssetId } from "@/lib/wallet/assets";

export function WalletBar() {
  const [open, setOpen] = useState(false);
  const [rates, setRates] = useState<Record<string, number>>({
    SOL: 145,
    USDT: 1,
    USDC: 1,
    ETH: 3200,
    LTC: 85,
    BTC: 95000,
  });
  const [displayAsset, setDisplayAsset] = useState<WalletAssetId>("SOL");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/wallet/rates");
        if (!res.ok) return;
        const data = await res.json();
        if (alive && data.rates) setRates(data.rates);
      } catch {
        /* keep fallback */
      }
    };
    void load();
    const id = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const asset = getAsset(displayAsset);
  const price = rates[displayAsset] ?? 0;

  return (
    <>
      <div className="relative z-50 flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl border border-[#2a2a2a] bg-[#171717] px-2.5 py-1.5 text-sm text-white hover:border-[#3a3a3a] sm:px-3"
          >
            <CryptoLogo id={asset.id} size={20} />
            <span className="font-semibold tabular-nums">
              $
              {price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-xs text-[#888]">▾</span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 z-[60] mt-2 w-48 overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#171717] shadow-xl">
              {WALLET_ASSETS.map((a) => {
                const p = rates[a.id] ?? 0;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setDisplayAsset(a.id);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-white/5"
                  >
                    <span className="flex items-center gap-2 text-white">
                      <CryptoLogo id={a.id} size={20} />
                      {a.symbol}
                    </span>
                    <span className="text-[#9a9a9a] tabular-nums">
                      ${p.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setMenuOpen(false);
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-[#22c55e] px-3 py-1.5 text-sm font-semibold text-black transition hover:bg-[#4ade80] sm:px-3.5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a1 1 0 0 1 1 1v1.5M3 7.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H5.5A2.5 2.5 0 0 1 3 7.5Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <circle cx="17" cy="14" r="1.15" fill="currentColor" />
          </svg>
          <span>Wallet</span>
        </button>
      </div>

      <WalletModal open={open} onClose={() => setOpen(false)} rates={rates} />
    </>
  );
}
