import type { Vendor } from "@unsyphn/shared";

export type ViewMode = "grid" | "table";

export type PostureFilter = "ok" | "watch" | "risk";

export type SortKey =
  | "default"
  | "spend-desc"
  | "renew-soon"
  | "tier"
  | "posture"
  | "name";

export interface PortfolioFilterState {
  q: string;
  tiers: ReadonlyArray<1 | 2 | 3>;
  postures: ReadonlyArray<PostureFilter>;
  categories: ReadonlyArray<string>;
  owner: string | "";
  sort: SortKey;
  view: ViewMode;
}

export const DEFAULT_FILTERS: PortfolioFilterState = {
  q: "",
  tiers: [],
  postures: [],
  categories: [],
  owner: "",
  sort: "default",
  view: "grid",
};

export function isFiltersActive(s: PortfolioFilterState): boolean {
  return (
    s.q.length > 0 ||
    s.tiers.length > 0 ||
    s.postures.length > 0 ||
    s.categories.length > 0 ||
    s.owner !== "" ||
    s.sort !== "default"
  );
}

export function daysUntil(iso: string | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.round((t - Date.now()) / 86_400_000);
}

export function applyFilters(
  vendors: Vendor[],
  f: PortfolioFilterState,
): Vendor[] {
  const q = f.q.trim().toLowerCase();
  const tierSet = new Set<number>(f.tiers);
  const postureSet = new Set<string>(f.postures);
  const categorySet = new Set<string>(f.categories);

  const filtered = vendors.filter((v) => {
    if (q && !v.name.toLowerCase().includes(q)) return false;
    if (tierSet.size > 0 && (!v.tier || !tierSet.has(v.tier))) return false;
    if (postureSet.size > 0 && (!v.posture || !postureSet.has(v.posture))) return false;
    if (categorySet.size > 0 && (!v.category || !categorySet.has(v.category))) return false;
    if (f.owner && v.ownerId !== f.owner) return false;
    return true;
  });

  if (f.sort === "default") return filtered;
  const sorted = [...filtered];
  sorted.sort((a, b) => {
    switch (f.sort) {
      case "spend-desc":
        return (b.contract?.annualSpendUsd ?? 0) - (a.contract?.annualSpendUsd ?? 0);
      case "renew-soon": {
        const da = daysUntil(a.contract?.renewsAt) ?? 9999;
        const db = daysUntil(b.contract?.renewsAt) ?? 9999;
        return da - db;
      }
      case "tier":
        return (a.tier ?? 9) - (b.tier ?? 9);
      case "posture": {
        const order: Record<string, number> = { risk: 0, watch: 1, ok: 2 };
        return (order[a.posture ?? "ok"] ?? 9) - (order[b.posture ?? "ok"] ?? 9);
      }
      case "name":
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });
  return sorted;
}

export function fmtUsd(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${Math.round(usd / 1_000)}k`;
  return `$${usd}`;
}

export function postureColor(p: string | undefined): string {
  if (p === "risk") return "#dc2626";
  if (p === "watch") return "#d97706";
  return "#64748b";
}

export function postureBg(p: string | undefined): string {
  if (p === "risk") return "rgba(220,38,38,0.10)";
  if (p === "watch") return "rgba(217,119,6,0.10)";
  return "rgba(100,116,139,0.10)";
}
