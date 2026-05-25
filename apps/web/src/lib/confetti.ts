import confetti from "canvas-confetti";

const reducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// jsdom and other no-canvas environments would throw inside canvas-confetti's
// rAF loop. Detect once at module load via the navigator UA — jsdom labels
// itself in navigator.userAgent so we skip the noisy `getContext` polyfill
// warning vitest prints.
const canvasSupported = (): boolean => {
  if (typeof document === "undefined" || typeof navigator === "undefined") return false;
  if (/jsdom/i.test(navigator.userAgent)) return false;
  if (typeof HTMLCanvasElement === "undefined") return false;
  return true;
};

const CANVAS_OK = canvasSupported();

export interface CelebrateOptions {
  particleCount?: number;
  spread?: number;
  origin?: { x?: number; y?: number };
  colors?: string[];
}

export function celebrate(opts?: CelebrateOptions): void {
  if (reducedMotion() || !CANVAS_OK) return;
  void confetti({
    particleCount: opts?.particleCount ?? 80,
    spread: opts?.spread ?? 70,
    startVelocity: 35,
    decay: 0.92,
    gravity: 1.0,
    ticks: 220,
    origin: opts?.origin ?? { x: 0.5, y: 0.4 },
    colors:
      opts?.colors ?? ["#5E6AD2", "#2BCAE8", "#B5DC55", "#FF9540", "#F46688"],
    disableForReducedMotion: true,
  });
}

export function celebrateFromElement(el: HTMLElement): void {
  if (reducedMotion() || !CANVAS_OK) return;
  const rect = el.getBoundingClientRect();
  const x = (rect.left + rect.width / 2) / window.innerWidth;
  const y = (rect.top + rect.height / 2) / window.innerHeight;
  celebrate({ origin: { x, y }, particleCount: 50 });
}
