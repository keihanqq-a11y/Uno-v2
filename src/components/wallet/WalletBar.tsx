"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { WalletModal } from "@/components/wallet/WalletModal";
import { CryptoLogo } from "@/components/wallet/CryptoLogo";
import { WALLET_ASSETS, getAsset, type WalletAssetId } from "@/lib/wallet/assets";

type OpenTab = "Deposit" | "Withdraw" | "Tip" | "Buy Crypto";

const DEMO_BALANCE_USD = 65239;

export function WalletBar() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<OpenTab>("Deposit");
  const [displayAsset, setDisplayAsset] = useState<WalletAssetId>("BTC");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: OpenTab }>).detail;
      setTab(detail?.tab ?? "Deposit");
      setOpen(true);
      setMenuOpen(false);
    };
    window.addEventListener("uno:open-wallet", handler as EventListener);
    return () => window.removeEventListener("uno:open-wallet", handler as EventListener);
  }, []);

  const asset = getAsset(displayAsset);

  const openWalletTab = (next: OpenTab) => {
    setMenuOpen(false);
    setTab(next);
    setOpen(true);
  };

  return (
    <>
      <div className="relative flex items-center gap-1.5 sm:gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#141414] py-1.5 pl-1.5 pr-2.5 text-sm text-white transition hover:border-white/20 sm:pr-3"
            aria-expanded={menuOpen}
            aria-haspopup="listbox"
          >
            <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10">
              <CryptoLogo id={asset.id} size={22} />
            </span>
            <span className="font-semibold tabular-nums tracking-tight">
              $
              {DEMO_BALANCE_USD.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <motion.svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5 text-zinc-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              animate={{ rotate: menuOpen ? 180 : 0 }}
            >
              <path d="M6 9l6 6 6-6" />
            </motion.svg>
          </button>

          <AnimatePresence>
            {menuOpen ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-[90]"
                  aria-label="Close currency menu"
                  onClick={() => setMenuOpen(false)}
                />
                <motion.div
                  role="listbox"
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 z-[100] mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#121214] p-1.5 shadow-2xl"
                >
                  <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Display currency
                  </p>
                  {WALLET_ASSETS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      role="option"
                      aria-selected={a.id === displayAsset}
                      onClick={() => {
                        setDisplayAsset(a.id);
                        setMenuOpen(false);
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition ${
                        a.id === displayAsset
                          ? "bg-[#1aef4d]/12 text-white"
                          : "text-zinc-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full ring-1 ring-white/10">
                        <CryptoLogo id={a.id} size={22} />
                      </span>
                      <span className="flex-1 font-medium">{a.name}</span>
                      <span className="text-xs font-semibold text-zinc-500">{a.symbol}</span>
                    </button>
                  ))}
                </motion.div>
              </>
            ) : null}
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={() => openWalletTab("Tip")}
          className="hidden items-center gap-1.5 rounded-xl border border-white/10 bg-transparent px-2.5 py-1.5 text-sm font-semibold text-zinc-300 transition hover:border-[#1aef4d]/40 hover:bg-[#1aef4d]/10 hover:text-[#1aef4d] sm:inline-flex"
        >
          Tip
        </button>

        <button
          type="button"
          onClick={() => openWalletTab("Deposit")}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1aef4d] px-3 py-1.5 text-sm font-bold text-black transition hover:brightness-110 active:scale-[0.98] sm:px-3.5"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
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

      <WalletModal open={open} onClose={() => setOpen(false)} initialTab={tab} />
    </>
  );
}

export function openWallet(tab: OpenTab = "Deposit") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("uno:open-wallet", { detail: { tab } }));
}
