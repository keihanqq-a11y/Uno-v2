"use client";

import { useEffect, useMemo, useState } from "react";
import {
  WALLET_ASSETS,
  getAsset,
  qrCodeUrl,
  shortenAddress,
  type WalletAssetId,
} from "@/lib/wallet/assets";
import { cn } from "@/lib/utils";

type Tab = "Deposit" | "Withdraw" | "Gift Cards" | "Buy Crypto" | "Tip";

const TABS: Tab[] = ["Deposit", "Withdraw", "Gift Cards", "Buy Crypto", "Tip"];

function AssetIcon({ id, className }: { id: WalletAssetId; className?: string }) {
  const asset = getAsset(id);
  return (
    <span
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white",
        className,
      )}
      style={{ background: asset.color }}
      aria-hidden
    >
      {asset.symbol.slice(0, 1)}
    </span>
  );
}

export function WalletModal({
  open,
  onClose,
  rates,
}: {
  open: boolean;
  onClose: () => void;
  rates: Record<string, number>;
}) {
  const [tab, setTab] = useState<Tab>("Deposit");
  const [assetId, setAssetId] = useState<WalletAssetId>("SOL");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState("1000");

  const asset = getAsset(assetId);
  const price = rates[asset.id] ?? 0;

  const usdValue = useMemo(() => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n * price;
  }, [amount, price]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(asset.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Close wallet"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#141414] shadow-2xl animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2a2a2a] px-5 py-4">
          <div className="flex items-center gap-2 text-white">
            <WalletGlyph />
            <span className="font-semibold">Wallet</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[#888] hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-[#2a2a2a] px-3 py-2">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors",
                tab === t
                  ? "bg-[#222] text-white"
                  : "text-[#9a9a9a] hover:text-white",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-5">
          {tab === "Deposit" ? (
            <DepositPanel
              assetId={assetId}
              setAssetId={setAssetId}
              pickerOpen={pickerOpen}
              setPickerOpen={setPickerOpen}
              copied={copied}
              onCopy={() => void copy()}
              amount={amount}
              setAmount={setAmount}
              usdValue={usdValue}
              price={price}
            />
          ) : (
            <ComingSoon tab={tab} />
          )}
        </div>
      </div>
    </div>
  );
}

function DepositPanel({
  assetId,
  setAssetId,
  pickerOpen,
  setPickerOpen,
  copied,
  onCopy,
  amount,
  setAmount,
  usdValue,
  price,
}: {
  assetId: WalletAssetId;
  setAssetId: (id: WalletAssetId) => void;
  pickerOpen: boolean;
  setPickerOpen: (v: boolean) => void;
  copied: boolean;
  onCopy: () => void;
  amount: string;
  setAmount: (v: string) => void;
  usdValue: number;
  price: number;
}) {
  const asset = getAsset(assetId);

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs text-[#9a9a9a]">Currency</p>
        <div className="relative">
          <button
            type="button"
            onClick={() => setPickerOpen(!pickerOpen)}
            className="flex w-full items-center justify-between rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-3 text-left hover:border-[#3a3a3a]"
          >
            <span className="flex items-center gap-3">
              <AssetIcon id={asset.id} />
              <span className="font-semibold text-white">{asset.name}</span>
            </span>
            <span className="text-[#888]">▾</span>
          </button>

          {pickerOpen && (
            <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] shadow-xl">
              {WALLET_ASSETS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setAssetId(a.id);
                    setPickerOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5",
                    a.id === assetId && "bg-white/5",
                  )}
                >
                  <AssetIcon id={a.id} />
                  <span className="flex-1 text-sm text-white">{a.name}</span>
                  <span className="text-xs text-[#888]">{a.symbol}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Network pill */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-1.5 text-sm text-[#cfcfcf]">
          <AssetIcon id={asset.id} className="h-4 w-4 text-[8px]" />
          {asset.network}
          <span className="text-[#666]">⇅</span>
        </div>
      </div>

      <p className="text-xs text-[#9a9a9a]">Your {asset.name} deposit address</p>

      {/* QR */}
      <div className="flex justify-center">
        <div className="rounded-2xl bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrCodeUrl(asset.address, 220)}
            alt={`${asset.symbol} deposit QR`}
            width={220}
            height={220}
            className="block rounded-lg"
          />
        </div>
      </div>

      {/* Address + copy */}
      <div className="flex items-center gap-3 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-3">
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 rounded-md p-2 text-[#cfcfcf] hover:bg-white/5 hover:text-white"
          title="Copy address"
        >
          {copied ? "✓" : "⧉"}
        </button>
        <code className="flex-1 break-all text-sm text-white">
          {shortenAddress(asset.address, 14, 10)}
        </code>
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 rounded-lg bg-[#1f6b3a] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#258046]"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <p className="text-center text-xs text-[#8a8a8a]">{asset.warning}</p>

      {/* Conversion */}
      <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
        <p className="mb-3 text-[10px] uppercase tracking-[0.16em] text-[#8a8a8a]">
          Conversion rate
        </p>
        <div className="mb-3 flex items-center justify-between gap-2 text-sm">
          <span className="text-[#9a9a9a]">
            1 {asset.symbol} ≈{" "}
            <span className="text-white">
              ${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            className="w-28 rounded-lg border border-[#2a2a2a] bg-[#111] px-3 py-1.5 text-right text-white outline-none focus:border-[#3a3a3a]"
            inputMode="decimal"
            aria-label="Amount"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-white">
            <AssetIcon id={asset.id} />
            <span className="font-medium">
              {amount || "0"} {asset.symbol}
            </span>
          </div>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#222] text-xs text-[#aaa]">
            ≈
          </span>
          <div className="flex items-center gap-2 text-white">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1f6b3a] text-[10px] font-bold">
              $
            </span>
            <span className="font-medium">
              $
              {usdValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              USD
            </span>
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] text-[#666]">
        Send your deposit on the {asset.network}. Wrong network deposits may be lost.
      </p>
    </div>
  );
}

function ComingSoon({ tab }: { tab: Tab }) {
  return (
    <div className="py-16 text-center">
      <p className="text-lg text-white">{tab}</p>
      <p className="mt-2 text-sm text-[#8a8a8a]">Coming soon</p>
    </div>
  );
}

function WalletGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a1 1 0 0 1 1 1v1.5M3 7.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H5.5A2.5 2.5 0 0 1 3 7.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="17" cy="14" r="1.2" fill="currentColor" />
    </svg>
  );
}
