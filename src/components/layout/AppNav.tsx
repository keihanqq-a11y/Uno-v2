"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { WalletBar } from "@/components/wallet/WalletBar";

const links = [
  { href: "/play", label: "Play" },
  { href: "/dashboard", label: "Home" },
  { href: "/friends", label: "Friends" },
  { href: "/leaderboard", label: "Ranks" },
  { href: "/history", label: "History" },
  { href: "/rewards", label: "Rewards" },
];

export function AppNav() {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-[#0A0A0A]/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/play" className="group flex shrink-0 items-baseline gap-2">
          <span className="font-display text-2xl tracking-[0.12em] text-gold transition-colors group-hover:text-[#e0c04a]">
            UNO
          </span>
          <span className="text-[10px] uppercase tracking-[0.28em] text-muted">Premium</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors",
                pathname.startsWith(l.href) ? "text-gold" : "text-muted hover:text-text",
              )}
            >
              {l.label}
            </Link>
          ))}
          {user && (user.role === "ADMIN" || user.role === "MODERATOR") && (
            <Link
              href="/admin"
              className={cn(
                "rounded-md px-3 py-2 text-sm",
                pathname.startsWith("/admin") ? "text-gold" : "text-muted hover:text-text",
              )}
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <WalletBar />
          {!loading && user && (
            <Link
              href={`/profile/${user.username}`}
              className="hidden items-center gap-2 text-sm text-muted hover:text-gold sm:flex"
            >
              <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-xs text-gold">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  user.displayName.slice(0, 1).toUpperCase()
                )}
              </span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
