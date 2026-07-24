/** Lightweight SFX helpers — safe to call from client components. */

const cache = new Map<string, HTMLAudioElement>();

function getAudio(src: string): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  let a = cache.get(src);
  if (!a) {
    a = new Audio(src);
    a.preload = "auto";
    cache.set(src, a);
  }
  return a;
}

export function playSfx(
  src: string,
  opts: { volume?: number; playbackRate?: number } = {},
) {
  try {
    const base = getAudio(src);
    if (!base) return;
    const a = base.cloneNode(true) as HTMLAudioElement;
    a.volume = opts.volume ?? 0.7;
    if (opts.playbackRate) a.playbackRate = opts.playbackRate;
    void a.play().catch(() => {
      /* autoplay may block until user gesture */
    });
  } catch {
    /* ignore */
  }
}

/** Card slap / deal sound from shared Drive pack. */
export function playCardPlace(kind: "deal" | "play" = "play") {
  playSfx("/sounds/card-place.mp3", {
    volume: kind === "deal" ? 0.55 : 0.75,
    playbackRate: kind === "deal" ? 1.05 : 1,
  });
}
