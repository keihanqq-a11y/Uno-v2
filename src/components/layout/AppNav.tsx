"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { WalletBar } from "@/components/wallet/WalletBar";

const links = [
  { href: "/play", label: "Play" },
  { href: "/leaderboard", label: "Ranks" },
];

export function AppNav() {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[#d4af37]/15 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/play" className="group flex shrink-0 items-center gap-2">
          <span className="font-display text-2xl font-extrabold tracking-tight text-[#e8c56a] transition group-hover:text-[#f0d78a]">
            UnoX
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm transition-colors",
                pathname.startsWith(l.href)
                  ? "text-[#e8c56a]"
                  : "text-muted hover:text-[#e8c56a]/90",
              )}
            >
              {l.label}
            </Link>
          ))}
          {user && (user.role === "ADMIN" || user.role === "MODERATOR") && (
            <Link
              href="/admin"
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                pathname.startsWith("/admin") ? "text-[#e8c56a]" : "text-muted hover:text-[#e8c56a]/90",
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
              className="hidden h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-[#d4af37]/25 bg-[#141414] text-xs font-semibold text-[#e8c56a] sm:flex"
              title={user.displayName}
            >
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                user.displayName.slice(0, 1).toUpperCase()
              )}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
