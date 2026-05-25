import { useEffect, useRef, useState, type CSSProperties } from "react";

interface CountUpProps {
  value: number;
  durationMs?: number;
  format?: (n: number) => string;
  className?: string;
  style?: CSSProperties;
}

const reduced = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function CountUp({
  value,
  durationMs = 900,
  format,
  className,
  style,
}: CountUpProps): JSX.Element {
  const [display, setDisplay] = useState<number>(reduced() ? value : 0);
  const fromRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const displayRef = useRef<number>(display);
  displayRef.current = display;

  useEffect(() => {
    if (reduced()) {
      setDisplay(value);
      return;
    }
    fromRef.current = displayRef.current;
    startRef.current = null;
    const tick = (now: number): void => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const p = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = fromRef.current + (value - fromRef.current) * eased;
      setDisplay(next);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs]);

  const formatted = format
    ? format(display)
    : Number.isInteger(value)
      ? Math.round(display).toString()
      : display.toFixed(1);

  return (
    <span className={className} style={style}>
      {formatted}
    </span>
  );
}
