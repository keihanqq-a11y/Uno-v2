"use client";

import { useId } from "react";
import type { WalletAssetId } from "@/lib/wallet/assets";
import { cn } from "@/lib/utils";

/** Official-style circular crypto marks. Unique gradient IDs per instance. */
export function CryptoLogo({
  id,
  size = 24,
  className,
}: {
  id: WalletAssetId;
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const common = cn("shrink-0 block", className);

  if (id === "ETH") {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={common} aria-hidden>
        <circle cx="16" cy="16" r="16" fill="#627EEA" />
        <path fill="#fff" fillOpacity="0.6" d="M16 5.5v8.3l7 3.1z" />
        <path fill="#fff" d="M16 5.5 9 16.9l7-3.1z" />
        <path fill="#fff" fillOpacity="0.6" d="M16 22.1v4.4l7.01-9.7z" />
        <path fill="#fff" d="M16 26.5v-4.4l-7-5.3z" />
        <path fill="#fff" fillOpacity="0.2" d="M16 20.3l7-3.4-7-3.1z" />
        <path fill="#fff" fillOpacity="0.6" d="M9 16.9l7 3.4v-6.5z" />
      </svg>
    );
  }

  if (id === "BTC") {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={common} aria-hidden>
        <circle cx="16" cy="16" r="16" fill="#F7931A" />
        <path
          fill="#fff"
          d="M22.5 14.1c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.6-.4-.7 2.6c-.4-.1-.9-.2-1.3-.3l.7-2.6-1.6-.4-.7 2.7c-.3-.1-.7-.2-1-.2l-2.2-.6-.4 1.7s1.2.3 1.2.3c.6.2.8.6.7.9l-.7 3.1c0 .1 0 .1 0 .2l-1.9 7.5c-.1.2-.2.5-.7.4 0 0-1.2-.3-1.2-.3l-.8 1.9 2.1.5c.4.1.8.2 1.1.3l-.7 2.8 1.6.4.7-2.7c.4.1.9.2 1.3.3l-.7 2.7 1.6.4.7-2.8c2.9.5 5 .3 5.9-2.3.8-2.1-.1-3.3-1.5-4 .9-.3 1.7-1.1 1.9-2.5Zm-3.4 4.8c-.5 2.2-4.2 1-5.4.7l1-3.8c1.2.3 5 .9 4.4 3.1Zm.6-4.8c-.5 2-3.5 1-4.5.7l.9-3.5c1 .2 4.1.7 3.6 2.8Z"
        />
      </svg>
    );
  }

  if (id === "SOL") {
    const g = `sol-${uid}`;
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={common} aria-hidden>
        <circle cx="16" cy="16" r="16" fill="#000" />
        <defs>
          <linearGradient id={g} x1="5" y1="27" x2="27" y2="5" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00FFA3" />
            <stop offset="0.5" stopColor="#03E1FF" />
            <stop offset="1" stopColor="#DC1FFF" />
          </linearGradient>
        </defs>
        <path
          fill={`url(#${g})`}
          d="M9.5 19.8c.2-.2.4-.3.6-.3h12.2c.5 0 .7.6.4.9l-2.2 2.2c-.2.2-.4.3-.6.3H7.7c-.5 0-.7-.6-.4-.9l2.2-2.2Zm0-9.7c.2-.2.4-.3.6-.3h12.2c.5 0 .7.6.4.9l-2.2 2.2c-.2.2-.4.3-.6.3H7.7c-.5 0-.7-.6-.4-.9l2.2-2.2Zm13.4 4.8c-.2-.2-.4-.3-.6-.3H10.1c-.5 0-.7.6-.4.9l2.2 2.2c.2.2.4.3.6.3h12.2c.5 0 .7-.6.4-.9l-2.2-2.2Z"
        />
      </svg>
    );
  }

  if (id === "USDC") {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={common} aria-hidden>
        <circle cx="16" cy="16" r="16" fill="#2775CA" />
        <path
          fill="#fff"
          d="M20.3 18.4c0-1.3-.8-2.2-2.4-2.6v3.4c1.4-.2 2.4-.8 2.4-1.8Zm-1.1-4.5c0-1-.7-1.7-2-1.9v3.9c1.4-.2 2-.9 2-2Zm4.3 4.5c0 2.3-1.6 3.7-4.3 4.1V25h-2.3v-2.4c-.9-.1-1.8-.3-2.6-.6l.4-2.3h.3c.9.1 1.5 0 1.5-.9v-7c0-.8-.5-1.1-1.5-1h-.2l-.5-.1-.4-2.2c.7-.2 1.6-.4 2.5-.5V6h2.3v2.3c2.5.3 4.1 1.7 4.1 3.9 0 1.7-1 2.8-2.5 3.4 1.9.6 3.1 1.9 3.1 3.8Z"
        />
        <path
          fill="#fff"
          fillOpacity="0.5"
          d="M12.4 9.2c-3.5 1.4-5.9 4.8-5.9 8.8 0 5.2 4.2 9.4 9.4 9.4 2.1 0 4-.7 5.6-1.8-2.1 1.6-4.7 2.5-7.5 2.5-6.9 0-12.5-5.6-12.5-12.5 0-5.2 3.2-9.7 7.7-11.6.7 1.5 1.7 2.9 3.2 5.2Z"
        />
      </svg>
    );
  }

  if (id === "USDT") {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={common} aria-hidden>
        <circle cx="16" cy="16" r="16" fill="#26A17B" />
        <path
          fill="#fff"
          d="M17.9 16.7v-.1c-.1 0-1.1.1-3.4.1-1.7 0-2.9 0-3.3-.1v.1c0 2.1 3 2.4 3.3 2.4.4 0 3.4-.2 3.4-2.4Zm-.1-2.5c.6-.2 1.8-.6 1.8-2.1 0-1.8-2.2-2.2-3.1-2.2H9.8v8.5h3.2v-2.6h1.6c1.3 0 3.6-.4 3.6-2.4 0-.5-.1-.9-.4-1.2Zm-1.6-.9h-3.2V12h3.1c.7 0 1.4.2 1.4.7 0 .6-.7.7-1.3.7Z"
        />
        <path fill="#fff" d="M17.5 9.2h3.4v2.1h-8.3V9.2h3.4V7.5h1.5v1.7Z" />
      </svg>
    );
  }

  // LTC
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={common} aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#345D9D" />
      <path
        fill="#fff"
        d="M10.4 18.4 9 14.2l1.9-.5 1.1 3.4 7.2-2.1.5 1.9-9.3 2.7-.6 3.6h10.5l.6 2.1H9.2l1.2-7.9Z"
      />
      <path fill="#fff" d="m14.6 10.2.6 2.1-2 .6-.6-2.1 2-.6Z" />
    </svg>
  );
}
