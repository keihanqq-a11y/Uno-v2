"use client";

import type { WalletAssetId } from "@/lib/wallet/assets";
import { cn } from "@/lib/utils";

/** Official-style circular crypto logos as inline SVGs. */
export function CryptoLogo({
  id,
  size = 24,
  className,
}: {
  id: WalletAssetId;
  size?: number;
  className?: string;
}) {
  const common = cn("shrink-0 rounded-full", className);
  const s = size;

  switch (id) {
    case "ETH":
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" className={common} aria-hidden>
          <circle cx="16" cy="16" r="16" fill="#627EEA" />
          <path d="M16.5 5v8.87l7.5 3.35L16.5 5Z" fill="#fff" fillOpacity="0.6" />
          <path d="M16.5 5 9 17.22l7.5-3.35V5Z" fill="#fff" />
          <path d="M16.5 21.97v5.03L24 18.62l-7.5 3.35Z" fill="#fff" fillOpacity="0.6" />
          <path d="M16.5 27v-5.03L9 18.62 16.5 27Z" fill="#fff" />
          <path d="M16.5 20.57 24 17.22 16.5 13.87v6.7Z" fill="#fff" fillOpacity="0.2" />
          <path d="M9 17.22l7.5 3.35v-6.7L9 17.22Z" fill="#fff" fillOpacity="0.6" />
        </svg>
      );
    case "USDC":
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" className={common} aria-hidden>
          <circle cx="16" cy="16" r="16" fill="#2775CA" />
          <path
            fill="#fff"
            d="M20.3 18.2c0-1.4-.9-2.4-2.7-2.7l.1-.1c1.3-.3 2-1.1 2-2.3 0-1.5-1.2-2.5-3.1-2.8V8.5h-1.5v1.7c-.5.1-.9.2-1.4.3v-2H12v2.1c-.4.1-.8.2-1.1.3l.3 1.7c.2 0 .3-.1.4-.1h.2c.6 0 .9.3.9.8v6.6c0 .4-.2.6-.7.6h-.3l-.4.1-.3 1.8c.4.1.9.3 1.4.4v1.8h1.5v-1.7c.5.1 1 .2 1.5.2v1.5h1.5v-1.6c2.3-.3 3.8-1.5 3.8-3.5zm-5.7-5.4c0-.7.5-1.1 1.4-1.1.3 0 .6 0 .9.1v2.2c-.3.1-.6.1-.9.1-.8 0-1.4-.4-1.4-1.3zm3.3 5.9c0 .8-.6 1.3-1.7 1.3-.3 0-.7 0-1-.1v-2.6c.3-.1.7-.1 1-.1 1.1 0 1.7.5 1.7 1.5z"
          />
        </svg>
      );
    case "SOL":
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" className={common} aria-hidden>
          <circle cx="16" cy="16" r="16" fill="#000" />
          <defs>
            <linearGradient id="sol1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00FFA3" />
              <stop offset="100%" stopColor="#DC1FFF" />
            </linearGradient>
          </defs>
          <path
            fill="url(#sol1)"
            d="M10.2 19.6c.2-.2.4-.3.7-.3h11.7c.4 0 .7.5.3.9l-2.3 2.3c-.2.2-.4.3-.7.3H8.2c-.4 0-.7-.5-.3-.9l2.3-2.3Zm0-10.1c.2-.2.4-.3.7-.3h11.7c.4 0 .7.5.3.9l-2.3 2.3c-.2.2-.4.3-.7.3H8.2c-.4 0-.7-.5-.3-.9l2.3-2.3Zm12.4 5.1c-.2-.2-.4-.3-.7-.3H10.2c-.4 0-.7.5-.3.9l2.3 2.3c.2.2.4.3.7.3h11.7c.4 0 .7-.5.3-.9l-2.3-2.3Z"
          />
        </svg>
      );
    case "LTC":
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" className={common} aria-hidden>
          <circle cx="16" cy="16" r="16" fill="#345D9D" />
          <path
            fill="#fff"
            d="M10.4 19.4 12 9.5h2.2l-.8 5.1 3.2-.9.4 1.8-3.2.9-.7 4.4H21l-.5 2.2H9.6l.8-4.6Z"
          />
          <path fill="#fff" d="M9.2 16.2h8.5l.4 1.7H9.6l-.4-1.7Z" />
        </svg>
      );
    case "USDT":
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" className={common} aria-hidden>
          <circle cx="16" cy="16" r="16" fill="#50AF95" />
          <path
            fill="#fff"
            d="M17.4 15.8v2.1c3.2.2 5.5.9 5.5 1.8 0 1-2.8 1.8-6.3 1.8s-6.3-.8-6.3-1.8c0-.9 2.3-1.6 5.4-1.8v-2.1C9.8 16 6.5 17 6.5 18.5c0 2 4.5 3.6 10.1 3.6s10.1-1.6 10.1-3.6c0-1.5-3.3-2.5-9.3-2.7Zm0-1.4v-6h5.1V6.3H9.1v2.1h5.1v6c-5.5.2-9.6 1.4-9.6 2.8 0 1.6 4.8 2.9 10.8 2.9s10.8-1.3 10.8-2.9c0-1.4-4.1-2.6-9.9-2.8Z"
          />
        </svg>
      );
    case "BTC":
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" className={common} aria-hidden>
          <circle cx="16" cy="16" r="16" fill="#F7931A" />
          <path
            fill="#fff"
            d="M22.1 14.1c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.6-.4-.7 2.6c-.4-.1-.9-.2-1.3-.3l.7-2.7-1.6-.4-.7 2.7c-.4-.1-.7-.2-1.1-.3l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8 1l-.8 3.1c0 .1.1.1.1.2h-.1l-1.1 4.5c-.1.2-.3.5-.7.4 0 0-1.2-.3-1.2-.3l-.8 1.9 2.1.5c.4.1.8.2 1.1.3l-.7 2.8 1.6.4.7-2.7c.4.1.9.2 1.3.3l-.7 2.7 1.6.4.7-2.8c2.9.5 5.1.3 6-.2 2.1-1.3 1.3-4.1-.4-5.1 1.1-.3 2-1 2.2-2.6Zm-3.9 5.5c-.4 1.8-3.5.8-4.5.6l.8-3.2c1 .2 4.2.7 3.7 2.6Zm.4-5.5c-.4 1.6-2.9.8-3.7.6l.7-2.9c.8.2 3.5.6 3 2.3Z"
          />
        </svg>
      );
    default:
      return null;
  }
}
