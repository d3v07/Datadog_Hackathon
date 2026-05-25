import type { CSSProperties } from "react";

interface SkeletonRowProps {
  /** Outer container height in px. */
  height?: number;
  /** Number of horizontal text bars rendered (vertically stacked). */
  bars?: number;
  /** Show a circular avatar/icon on the left. */
  avatar?: boolean;
  /** Show a small trailing bar on the right. */
  trail?: boolean;
  /** Extra container style. */
  style?: CSSProperties;
}

/**
 * Glass-soft skeleton row. Pairs the `.skeleton` shimmer (defined in
 * polish.css) with the same lift/blur surface used elsewhere in-app.
 */
export function SkeletonRow({
  height = 72,
  bars = 2,
  avatar = true,
  trail = true,
  style,
}: SkeletonRowProps): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="glass-soft"
      style={{
        height,
        padding: 16,
        marginBottom: 8,
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        gap: 16,
        ...style,
      }}
    >
      {avatar && (
        <div
          className="skeleton"
          style={{ width: 28, height: 28, borderRadius: "50%" }}
        />
      )}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          minWidth: 0,
        }}
      >
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className="skeleton"
            style={{
              width: i === 0 ? "55%" : "85%",
              height: i === 0 ? 12 : 10,
              borderRadius: 4,
            }}
          />
        ))}
      </div>
      {trail && (
        <div
          className="skeleton"
          style={{ width: 60, height: 12, borderRadius: 4 }}
        />
      )}
    </div>
  );
}

interface SkeletonCardProps {
  /** Card height. */
  height?: number;
  /** Number of horizontal text bars rendered in the body. */
  bars?: number;
  style?: CSSProperties;
}

/**
 * Larger card-shaped skeleton — for Reports grid, vendor detail cards.
 */
export function SkeletonCard({
  height = 180,
  bars = 4,
  style,
}: SkeletonCardProps): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="glass-soft"
      style={{
        height,
        padding: 20,
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <div
          className="skeleton"
          style={{ width: 18, height: 18, borderRadius: 4 }}
        />
        <div
          className="skeleton"
          style={{ flex: 1, height: 14, borderRadius: 4, maxWidth: 220 }}
        />
        <div
          className="skeleton"
          style={{ width: 56, height: 18, borderRadius: 999 }}
        />
      </div>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            width: i === bars - 1 ? "50%" : `${75 + ((i * 7) % 18)}%`,
            height: 9,
            borderRadius: 4,
          }}
        />
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
        <div
          className="skeleton"
          style={{ width: 110, height: 28, borderRadius: 8 }}
        />
        <div
          className="skeleton"
          style={{ width: 90, height: 28, borderRadius: 8 }}
        />
      </div>
    </div>
  );
}
