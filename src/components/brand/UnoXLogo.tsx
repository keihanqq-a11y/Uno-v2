"use client";

import { cn } from "@/lib/utils";

type LogoSize = "nav" | "hero" | "table" | "sm";

const sizeMap: Record<
  LogoSize,
  { webp: string; png: string; className: string; width: number; height: number }
> = {
  nav: {
    webp: "/brand/unox-logo-nav.webp",
    png: "/brand/unox-logo-nav.png",
    className: "h-9 w-auto sm:h-10",
    width: 420,
    height: 277,
  },
  sm: {
    webp: "/brand/unox-logo-nav.webp",
    png: "/brand/unox-icon.png",
    className: "h-8 w-auto",
    width: 280,
    height: 185,
  },
  hero: {
    webp: "/brand/unox-logo.webp",
    png: "/brand/unox-logo.png",
    className: "h-28 w-auto sm:h-36 md:h-44",
    width: 800,
    height: 527,
  },
  table: {
    webp: "/brand/unox-logo.webp",
    png: "/brand/unox-logo.png",
    className: "h-16 w-auto drop-shadow-[0_4px_18px_rgba(0,0,0,0.65)] sm:h-20 md:h-24",
    width: 800,
    height: 527,
  },
};

export function UnoXLogo({
  size = "nav",
  className,
  alt = "UnoX",
  priority = false,
}: {
  size?: LogoSize;
  className?: string;
  alt?: string;
  priority?: boolean;
}) {
  const cfg = sizeMap[size];
  return (
    <picture>
      <source srcSet={cfg.webp} type="image/webp" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cfg.png}
        alt={alt}
        width={cfg.width}
        height={cfg.height}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        className={cn("select-none object-contain", cfg.className, className)}
        draggable={false}
      />
    </picture>
  );
}
