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

type Tab = "Deposit" | "Withdraw" | "Tip" | "Buy Crypto";

type Props = {
  open: boolean;
  onClose: () => void;
  initialTab?: Tab;
};

const TABS: Tab[] = ["Deposit", "Withdraw", "Tip", "Buy Crypto"];

function formatUsd(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function formatRate(n: number) {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

export function WalletModal({ open, onClose, initialTab = "Deposit" }: Props) {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [assetId, setAssetId] = useState<WalletAssetId>("SOL");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [amount, setAmount] = useState("1");
  const [copied, setCopied] = useState(false);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [tipUser, setTipUser] = useState("");
  const [tipAmount, setTipAmount] = useState("5");
  const [tipSent, setTipSent] = useState(false);

  const asset = useMemo(
    () => WALLET_ASSETS.find((a) => a.id === assetId) ?? WALLET_ASSETS[0],
    [assetId],
  );

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) setTab(initialTab);
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

  const usdRate = rates[asset.id] ?? 0;
  const cryptoAmount = Number(amount) || 0;
  const usdValue = cryptoAmount * usdRate;

  const copyAddress = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(asset.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }, [asset.address]);

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
            className="absolute inset-0 bg-black/75 backdrop-blur-[6px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-title"
            className="relative z-10 flex max-h-[min(92vh,820px)] w-full max-w-[440px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0e] shadow-[0_30px_80px_rgba(0,0,0,0.75)]"
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#1aef4d]/10 to-transparent" />

            <div className="relative flex items-center justify-between border-b border-white/8 px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#1aef4d]/15 ring-1 ring-[#1aef4d]/35">
                  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-[#1aef4d]" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 10h18M5 10V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2M5 10v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
                    <path d="M12 14v2" />
                  </svg>
                </span>
                <div>
                  <h2 id="wallet-title" className="font-display text-lg tracking-wide text-white">
                    Wallet
                  </h2>
                  <p className="text-[11px] text-zinc-500">Deposit · withdraw · tip friends</p>
                </div>
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

            <div className="relative flex gap-1 overflow-x-auto border-b border-white/8 px-3 py-2">
              {TABS.map((t) => {
                const active = tab === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTab(t);
                      setPickerOpen(false);
                      setTipSent(false);
                    }}
                    className={`relative shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      active ? "text-black" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {active ? (
                      <motion.span
                        layoutId="wallet-tab"
                        className="absolute inset-0 rounded-lg bg-[#1aef4d]"
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
                >
                  {tab === "Deposit" ? (
                    <DepositPanel
                      asset={asset}
                      assetId={assetId}
                      pickerOpen={pickerOpen}
                      setPickerOpen={setPickerOpen}
                      onPick={(id) => {
                        setAssetId(id);
                        setPickerOpen(false);
                        setCopied(false);
                      }}
                      amount={amount}
                      setAmount={setAmount}
                      usdRate={usdRate}
                      usdValue={usdValue}
                      copied={copied}
                      onCopy={copyAddress}
                    />
                  ) : null}

                  {tab === "Withdraw" ? (
                    <div className="space-y-4">
                      <AssetSelect
                        asset={asset}
                        open={pickerOpen}
                        setOpen={setPickerOpen}
                        onPick={(id) => {
                          setAssetId(id);
                          setPickerOpen(false);
                        }}
                      />
                      <Field label="Destination address">
                        <input
                          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 font-mono text-xs text-white outline-none focus:border-[#1aef4d]/50"
                          placeholder={`Paste ${asset.symbol} address`}
                        />
                      </Field>
                      <Field label="Amount">
                        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5">
                          <input
                            value={amount}
                            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                            className="w-full bg-transparent text-sm text-white outline-none"
                            inputMode="decimal"
                          />
                          <span className="text-xs font-semibold text-zinc-400">{asset.symbol}</span>
                        </div>
                      </Field>
                      <button
                        type="button"
                        className="w-full rounded-xl bg-[#1aef4d] py-3 text-sm font-bold text-black transition hover:brightness-110 active:scale-[0.99]"
                      >
                        Review withdrawal
                      </button>
                      <p className="text-center text-[11px] text-zinc-500">
                        Double-check the network and address before confirming.
                      </p>
                    </div>
                  ) : null}

                  {tab === "Tip" ? (
                    <TipPanel
                      tipUser={tipUser}
                      setTipUser={setTipUser}
                      tipAmount={tipAmount}
                      setTipAmount={setTipAmount}
                      tipSent={tipSent}
                      setTipSent={setTipSent}
                      onSend={() => {
                        if (!tipUser.trim() || !(Number(tipAmount) > 0)) return;
                        setTipSent(true);
                      }}
                    />
                  ) : null}

                  {tab === "Buy Crypto" ? (
                    <div className="space-y-4 py-2 text-center">
                      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                        <CryptoLogo id="BTC" size={36} />
                      </div>
                      <h3 className="font-display text-xl text-white">Buy crypto</h3>
                      <p className="mx-auto max-w-xs text-sm text-zinc-400">
                        Purchase SOL, BTC, ETH, and more with card or bank — coming soon.
                      </p>
                      <button
                        type="button"
                        disabled
                        className="w-full rounded-xl bg-white/10 py-3 text-sm font-semibold text-zinc-400"
                      >
                        Coming soon
                      </button>
                    </div>
                  ) : null}
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
                  a.id === asset.id ? "bg-[#1aef4d]/12" : "hover:bg-white/5"
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

function DepositPanel({
  asset,
  assetId,
  pickerOpen,
  setPickerOpen,
  onPick,
  amount,
  setAmount,
  usdRate,
  usdValue,
  copied,
  onCopy,
}: {
  asset: WalletAsset;
  assetId: WalletAssetId;
  pickerOpen: boolean;
  setPickerOpen: (v: boolean) => void;
  onPick: (id: WalletAssetId) => void;
  amount: string;
  setAmount: (v: string) => void;
  usdRate: number;
  usdValue: number;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-4">
      <AssetSelect asset={asset} open={pickerOpen} setOpen={setPickerOpen} onPick={onPick} />

      <motion.div
        key={assetId}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative mx-auto w-fit overflow-hidden rounded-2xl bg-white p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
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
          <motion.button
            type="button"
            onClick={onCopy}
            whileTap={{ scale: 0.95 }}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              copied ? "bg-white text-black" : "bg-[#1aef4d] text-black hover:brightness-110"
            }`}
          >
            {copied ? "Copied" : "Copy"}
          </motion.button>
        </div>
      </div>

      <p className="text-center text-[12px] leading-relaxed text-zinc-400">
        Send only <span className="font-semibold text-white">{asset.symbol}</span> on{" "}
        <span className="font-semibold text-white">{asset.network}</span> to this address.
      </p>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
        <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          <span>Conversion rate</span>
          <span className="normal-case tracking-normal text-zinc-300">
            1 {asset.symbol} ≈ {usdRate ? formatUsd(usdRate) : "—"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2.5">
            <CryptoLogo id={asset.id} size={20} />
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              className="w-full bg-transparent text-sm font-semibold text-white outline-none"
              inputMode="decimal"
            />
            <span className="text-xs text-zinc-500">{asset.symbol}</span>
          </div>
          <span className="text-zinc-600">≈</span>
          <div className="flex min-w-[7.5rem] items-center justify-end rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-semibold text-white">
            {usdRate ? formatUsd(usdValue) : "—"}
          </div>
        </div>
        {usdRate ? (
          <p className="mt-2 text-[11px] text-zinc-500">
            Live rate · 1 {asset.symbol} = ${formatRate(usdRate)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function TipPanel({
  tipUser,
  setTipUser,
  tipAmount,
  setTipAmount,
  tipSent,
  setTipSent,
  onSend,
}: {
  tipUser: string;
  setTipUser: (v: string) => void;
  tipAmount: string;
  setTipAmount: (v: string) => void;
  tipSent: boolean;
  setTipSent: (v: boolean) => void;
  onSend: () => void;
}) {
  if (tipSent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-4 py-6 text-center"
      >
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#1aef4d]/15 ring-1 ring-[#1aef4d]/40">
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-[#1aef4d]" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12l5 5L20 7" />
          </svg>
        </div>
        <h3 className="font-display text-xl text-white">Tip queued</h3>
        <p className="text-sm text-zinc-400">
          ${tipAmount} tip for <span className="text-white">{tipUser}</span> is ready once balances go live.
        </p>
        <button
          type="button"
          onClick={() => {
            setTipSent(false);
            setTipUser("");
          }}
          className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
        >
          Send another
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#1aef4d]/25 bg-[#1aef4d]/8 p-3.5">
        <p className="text-sm font-semibold text-[#1aef4d]">Tip a player</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">
          Send chips to friends after a clutch win — username or friend code works.
        </p>
      </div>

      <Field label="Player">
        <input
          value={tipUser}
          onChange={(e) => setTipUser(e.target.value)}
          placeholder="Username or friend code"
          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#1aef4d]/50"
        />
      </Field>

      <Field label="Amount (USD)">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5">
            <span className="text-zinc-500">$</span>
            <input
              value={tipAmount}
              onChange={(e) => setTipAmount(e.target.value.replace(/[^\d.]/g, ""))}
              className="w-full bg-transparent text-sm font-semibold text-white outline-none"
              inputMode="decimal"
            />
          </div>
          {["5", "10", "25", "50"].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setTipAmount(preset)}
              className={`rounded-lg px-2.5 py-2.5 text-xs font-bold transition ${
                tipAmount === preset
                  ? "bg-[#1aef4d] text-black"
                  : "bg-white/5 text-zinc-300 hover:bg-white/10"
              }`}
            >
              ${preset}
            </button>
          ))}
        </div>
      </Field>

      <button
        type="button"
        onClick={onSend}
        disabled={!tipUser.trim() || !(Number(tipAmount) > 0)}
        className="w-full rounded-xl bg-[#1aef4d] py-3 text-sm font-bold text-black transition hover:brightness-110 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Send tip
      </button>
    </div>
  );
}
