"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  WALLET_ASSETS,
  qrCodeUrl,
  type WalletAssetId,
  type WalletAsset,
} from "@/lib/wallet/assets";
import { CryptoLogo } from "@/components/wallet/CryptoLogo";
import { useAuth } from "@/hooks/useAuth";

type Tab = "Deposit" | "Withdraw";

type Props = {
  open: boolean;
  onClose: () => void;
  initialTab?: Tab;
};

const TABS: Tab[] = ["Deposit", "Withdraw"];

function formatUsd(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export function WalletModal({ open, onClose, initialTab = "Deposit" }: Props) {
  const { user, setBalance } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [assetId, setAssetId] = useState<WalletAssetId>("SOL");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [usdAmount, setUsdAmount] = useState("25");
  const [destAddress, setDestAddress] = useState("");
  const [copied, setCopied] = useState(false);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const asset = useMemo(
    () => WALLET_ASSETS.find((a) => a.id === assetId) ?? WALLET_ASSETS[0],
    [assetId],
  );

  const balance = user?.balanceUsd ?? 0;
  const usd = Number(usdAmount) || 0;
  const rate = rates[asset.id] ?? 0;
  const cryptoAmount = rate > 0 ? usd / rate : 0;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setError(null);
      setSuccess(null);
      setPickerOpen(false);
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/wallet/rates");
        const data = (await res.json()) as { rates?: Record<string, number> };
        if (!cancelled && data.rates) setRates(data.rates);
      } catch {
        /* keep previous */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const copyAddress = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(asset.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }, [asset.address]);

  const confirmDeposit = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountUsd: usd,
          assetId: asset.id,
          cryptoAmount: Number(cryptoAmount.toFixed(8)),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Deposit failed");
      setBalance(data.balanceUsd);
      setSuccess(`Deposit credited — balance ${formatUsd(data.balanceUsd)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deposit failed");
    } finally {
      setBusy(false);
    }
  };

  const confirmWithdraw = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountUsd: usd,
          assetId: asset.id,
          destinationAddress: destAddress,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Withdraw failed");
      setBalance(data.balanceUsd);
      setSuccess(`Sent to your wallet — balance ${formatUsd(data.balanceUsd)}`);
      setDestAddress("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Withdraw failed");
    } finally {
      setBusy(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="wallet-root"
          className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            type="button"
            aria-label="Close wallet"
            className="absolute inset-0 bg-black/80 backdrop-blur-[6px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-title"
            className="relative z-10 flex max-h-[min(92vh,820px)] w-full max-w-[420px] flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#0a0a0a] shadow-[0_30px_80px_rgba(0,0,0,0.8)]"
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex items-center justify-between border-b border-white/10 px-4 py-3.5">
              <div>
                <h2 id="wallet-title" className="font-display text-lg font-bold tracking-wide text-white">
                  Wallet
                </h2>
                <p className="text-[11px] text-zinc-500">
                  Balance {formatUsd(balance)}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="relative flex gap-1 border-b border-white/10 px-3 py-2">
              {TABS.map((t) => {
                const active = tab === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTab(t);
                      setPickerOpen(false);
                      setError(null);
                      setSuccess(null);
                    }}
                    className={`relative flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      active ? "text-black" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {active ? (
                      <motion.span
                        layoutId="wallet-tab"
                        className="absolute inset-0 rounded-lg bg-white"
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      />
                    ) : null}
                    <span className="relative z-10">{t}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative flex-1 overflow-y-auto px-4 py-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-4"
                >
                  <AssetSelect
                    asset={asset}
                    open={pickerOpen}
                    setOpen={setPickerOpen}
                    onPick={(id) => {
                      setAssetId(id);
                      setPickerOpen(false);
                      setCopied(false);
                    }}
                  />

                  {tab === "Deposit" ? (
                    <>
                      <motion.div
                        key={assetId}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative mx-auto w-fit overflow-hidden rounded-2xl bg-white p-3"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={qrCodeUrl(asset.address, 168)}
                          alt={`${asset.symbol} deposit QR`}
                          width={168}
                          height={168}
                          className="block"
                        />
                        <span className="pointer-events-none absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white shadow-sm ring-1 ring-black/5">
                          <CryptoLogo id={asset.id} size={28} />
                        </span>
                      </motion.div>

                      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/35">
                        <div className="flex items-center gap-2 px-3 py-2.5">
                          <p className="min-w-0 flex-1 truncate font-mono text-[11px] text-zinc-200 sm:text-xs">
                            {asset.address}
                          </p>
                          <button
                            type="button"
                            onClick={() => void copyAddress()}
                            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                              copied ? "bg-zinc-200 text-black" : "bg-white text-black hover:bg-neutral-200"
                            }`}
                          >
                            {copied ? "Copied" : "Copy"}
                          </button>
                        </div>
                      </div>

                      <p className="text-center text-[12px] leading-relaxed text-zinc-400">
                        Send only <span className="font-semibold text-white">{asset.symbol}</span> on{" "}
                        <span className="font-semibold text-white">{asset.network}</span>.
                      </p>

                      <Field label="Deposit amount (USD)">
                        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5">
                          <span className="text-zinc-500">$</span>
                          <input
                            value={usdAmount}
                            onChange={(e) => setUsdAmount(e.target.value.replace(/[^\d.]/g, ""))}
                            className="w-full bg-transparent text-sm font-semibold text-white outline-none"
                            inputMode="decimal"
                          />
                        </div>
                      </Field>

                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">
                        <div className="flex justify-between gap-3">
                          <span className="text-zinc-500">You send</span>
                          <span className="font-semibold text-white">
                            {rate ? `${cryptoAmount.toFixed(6)} ${asset.symbol}` : "—"}
                          </span>
                        </div>
                        <div className="mt-1.5 flex justify-between gap-3">
                          <span className="text-zinc-500">Rate</span>
                          <span>1 {asset.symbol} ≈ {rate ? formatUsd(rate) : "—"}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={busy || usd < 1}
                        onClick={() => void confirmDeposit()}
                        className="w-full rounded-xl bg-white py-3 text-sm font-bold text-black transition hover:bg-neutral-200 enabled:active:scale-[0.99] disabled:opacity-40"
                      >
                        {busy ? "Crediting…" : "Confirm deposit"}
                      </button>
                      <p className="text-center text-[11px] text-zinc-500">
                        After you send crypto, confirm to credit your UnoX balance.
                      </p>
                    </>
                  ) : (
                    <>
                      <Field label="Your wallet address">
                        <input
                          value={destAddress}
                          onChange={(e) => setDestAddress(e.target.value)}
                          placeholder={`${asset.symbol} address`}
                          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 font-mono text-xs text-white outline-none focus:border-white/30"
                        />
                      </Field>

                      <Field label="Withdraw amount (USD)">
                        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5">
                          <span className="text-zinc-500">$</span>
                          <input
                            value={usdAmount}
                            onChange={(e) => setUsdAmount(e.target.value.replace(/[^\d.]/g, ""))}
                            className="w-full bg-transparent text-sm font-semibold text-white outline-none"
                            inputMode="decimal"
                          />
                          <button
                            type="button"
                            onClick={() => setUsdAmount(String(balance))}
                            className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
                          >
                            Max
                          </button>
                        </div>
                      </Field>

                      <p className="text-[12px] text-zinc-500">
                        Available {formatUsd(balance)}. Funds leave your site balance and go to the address above.
                      </p>

                      <button
                        type="button"
                        disabled={busy || usd < 1 || !destAddress.trim() || usd > balance}
                        onClick={() => void confirmWithdraw()}
                        className="w-full rounded-xl bg-white py-3 text-sm font-bold text-black transition hover:bg-neutral-200 enabled:active:scale-[0.99] disabled:opacity-40"
                      >
                        {busy ? "Sending…" : "Withdraw to wallet"}
                      </button>
                    </>
                  )}

                  {error ? <p className="text-center text-sm text-red-400">{error}</p> : null}
                  {success ? <p className="text-center text-sm text-white">{success}</p> : null}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

function AssetSelect({
  asset,
  open,
  setOpen,
  onPick,
}: {
  asset: WalletAsset;
  open: boolean;
  setOpen: (v: boolean) => void;
  onPick: (id: WalletAssetId) => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 transition hover:border-white/20"
      >
        <span className="flex items-center gap-3">
          <CryptoLogo id={asset.id} size={28} />
          <span className="text-left">
            <span className="block text-sm font-semibold text-white">{asset.name}</span>
            <span className="block text-[11px] text-zinc-500">{asset.network}</span>
          </span>
        </span>
        <motion.svg
          viewBox="0 0 24 24"
          className="h-4 w-4 text-zinc-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          animate={{ rotate: open ? 180 : 0 }}
        >
          <path d="M6 9l6 6 6-6" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 z-30 mt-2 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-[#141416] p-1.5 shadow-2xl"
          >
            {WALLET_ASSETS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onPick(a.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition ${
                  a.id === asset.id ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                <CryptoLogo id={a.id} size={26} />
                <span className="flex-1">
                  <span className="block text-sm font-medium text-white">{a.name}</span>
                  <span className="block text-[11px] text-zinc-500">{a.network}</span>
                </span>
                <span className="text-xs font-semibold text-zinc-400">{a.symbol}</span>
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
