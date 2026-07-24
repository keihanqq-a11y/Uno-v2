"use client";

import { useEffect, useState } from "react";
import { WalletModal } from "@/components/wallet/WalletModal";
import { useAuth } from "@/hooks/useAuth";

type OpenTab = "Deposit" | "Withdraw";

export function WalletBar() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<OpenTab>("Deposit");

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: OpenTab }>).detail;
      setTab(detail?.tab ?? "Deposit");
      setOpen(true);
    };
    window.addEventListener("uno:open-wallet", handler as EventListener);
    return () => window.removeEventListener("uno:open-wallet", handler as EventListener);
  }, []);

  const balance = user?.balanceUsd ?? 0;

  const openWalletTab = (next: OpenTab) => {
    setTab(next);
    setOpen(true);
  };

  return (
    <>
      <div className="relative flex items-center">
        <div className="flex overflow-hidden rounded-xl border border-[#d4af37]/25 bg-[#111]">
          <button
            type="button"
            onClick={() => openWalletTab("Deposit")}
            className="px-3 py-2 text-sm font-semibold tabular-nums text-white transition hover:bg-[#d4af37]/8 sm:px-3.5"
          >
            ${" "}
            {balance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </button>
          <button
            type="button"
            onClick={() => openWalletTab("Deposit")}
            className="grid h-9 w-9 place-items-center bg-[#d4af37] text-black transition hover:bg-[#e0c04a] sm:h-10 sm:w-10"
            aria-label="Open wallet"
            title="Wallet"
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
          </button>
        </div>
      </div>

      <WalletModal open={open} onClose={() => setOpen(false)} initialTab={tab} />
    </>
  );
}

export function openWallet(tab: OpenTab = "Deposit") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("uno:open-wallet", { detail: { tab } }));
}
