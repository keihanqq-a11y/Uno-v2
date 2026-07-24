import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Full-bleed visual plane */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 70% 40%, rgba(212,175,55,0.14), transparent 55%), linear-gradient(160deg, #0A0A0A 0%, #111 45%, #0A0A0A 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4AF37' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      {/* Stylized card fan as dominant visual */}
      <div className="pointer-events-none absolute right-[-5%] top-1/2 hidden h-[420px] w-[520px] -translate-y-1/2 md:block">
        {[
          { rot: -28, color: "#c62828", label: "7" },
          { rot: -14, color: "#1565c0", label: "⊘" },
          { rot: 0, color: "#D4AF37", label: "UNO" },
          { rot: 14, color: "#2e7d32", label: "+2" },
          { rot: 28, color: "#f9a825", label: "⇄" },
        ].map((c, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 h-56 w-36 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-black/40 shadow-2xl animate-fade-up"
            style={{
              background: c.color,
              transform: `translate(-50%, -50%) rotate(${c.rot}deg) translateY(${i === 2 ? -12 : 0}px)`,
              animationDelay: `${i * 80}ms`,
              zIndex: i,
            }}
          >
            <div className="absolute inset-2 rounded-xl border border-white/25 flex items-center justify-center">
              <span
                className="font-display text-3xl font-semibold"
                style={{ color: c.color === "#f9a825" ? "#1a1a1a" : "#fff" }}
              >
                {c.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center px-6 py-16">
        <p className="animate-fade-up font-display text-6xl tracking-[0.14em] text-gold sm:text-7xl md:text-8xl">
          UNO
        </p>
        <h1
          className="animate-fade-up mt-4 max-w-xl font-display text-3xl font-semibold text-text sm:text-4xl"
          style={{ animationDelay: "100ms" }}
        >
          Private tables. Public matchmaking. Server-true play.
        </h1>
        <p
          className="animate-fade-up mt-4 max-w-md text-muted"
          style={{ animationDelay: "180ms" }}
        >
          A refined multiplayer arena for classic UNO — from lobby to last card.
        </p>
        <div
          className="animate-fade-up mt-10 flex flex-wrap gap-3"
          style={{ animationDelay: "260ms" }}
        >
          <Link href="/register">
            <Button size="lg">Enter the table</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="secondary">
              Sign in
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
