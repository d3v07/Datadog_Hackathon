import type { Vendor } from "@unsyphn/shared";

// Display-only posture buckets. The Vendor.posture field on the API only ever
// holds ok|watch|risk; we derive "fresh"/"expiring"/"stale" from the contract
// renewal date for badge text. Real mutations only ever write ok|watch|risk.
export type DisplayPosture = "fresh" | "ok" | "watch" | "expiring" | "stale" | "risk";

export function daysUntil(d: string | undefined): number | null {
  if (!d) return null;
  const ms = Date.parse(d);
  if (!Number.isFinite(ms)) return null;
  return Math.round((ms - Date.now()) / 86_400_000);
}

export function fmtUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1e3)}k`;
  return `$${n}`;
}

export function relTime(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  const diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function displayPosture(v: Vendor): DisplayPosture {
  const raw = (v.posture ?? "ok") as DisplayPosture;
  if (raw === "watch" || raw === "risk") return raw;
  const days = daysUntil(v.contract?.renewsAt ?? v.renewalDate);
  if (days !== null) {
    if (days < 0) return "stale";
    if (days <= 30) return "expiring";
    if (days <= 60) return "watch";
  }
  return "fresh";
}

export function postureClass(p: DisplayPosture): string {
  if (p === "fresh" || p === "ok") return "badge badge-success";
  if (p === "watch" || p === "expiring") return "badge badge-warning";
  return "badge badge-danger";
}

export function postureLabel(p: DisplayPosture): string {
  if (p === "fresh" || p === "ok") return "fresh";
  if (p === "expiring") return "expiring";
  if (p === "watch") return "watch";
  if (p === "stale") return "stale";
  return "risk";
}

// Deterministic hash → [0,1) used to seed synthetic numbers (seat utilization,
// monthly spend jitter) so the same vendor renders the same numbers across
// reloads. xfnv1a-ish, fits in 32 bits.
export function hashSeed(seed: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 4294967296;
  };
}
