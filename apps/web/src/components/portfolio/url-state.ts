import {
  DEFAULT_FILTERS,
  type PortfolioFilterState,
  type PostureFilter,
  type SortKey,
  type ViewMode,
} from "./types.js";

const VALID_SORTS: ReadonlyArray<SortKey> = [
  "default",
  "spend-desc",
  "renew-soon",
  "tier",
  "posture",
  "name",
];

function parseTiers(s: string | null): (1 | 2 | 3)[] {
  if (!s) return [];
  return s
    .split(",")
    .map((x) => Number.parseInt(x, 10))
    .filter((n): n is 1 | 2 | 3 => n === 1 || n === 2 || n === 3);
}

function parseCsv(s: string | null): string[] {
  return s ? s.split(",").filter(Boolean) : [];
}

function parsePostures(s: string | null): PostureFilter[] {
  return parseCsv(s).filter(
    (x): x is PostureFilter => x === "ok" || x === "watch" || x === "risk",
  );
}

export function parseFiltersFromUrl(search: string): PortfolioFilterState {
  const p = new URLSearchParams(search);
  const sort = (p.get("sort") ?? "default") as SortKey;
  const view = (p.get("view") === "table" ? "table" : "grid") as ViewMode;
  return {
    q: p.get("q") ?? "",
    tiers: parseTiers(p.get("tier")),
    postures: parsePostures(p.get("posture")),
    categories: parseCsv(p.get("category")),
    owner: p.get("owner") ?? "",
    sort: VALID_SORTS.includes(sort) ? sort : "default",
    view,
  };
}

export function writeFiltersToUrl(state: PortfolioFilterState): void {
  const url = new URL(window.location.href);
  const p = url.searchParams;
  const setOrDelete = (k: string, v: string) => {
    if (v) p.set(k, v);
    else p.delete(k);
  };
  setOrDelete("q", state.q);
  setOrDelete("tier", state.tiers.join(","));
  setOrDelete("posture", state.postures.join(","));
  setOrDelete("category", state.categories.join(","));
  setOrDelete("owner", state.owner);
  setOrDelete("sort", state.sort === "default" ? "" : state.sort);
  setOrDelete("view", state.view === "grid" ? "" : state.view);
  window.history.replaceState({}, "", url.toString());
}

export function initialFilters(): PortfolioFilterState {
  if (typeof window === "undefined") return DEFAULT_FILTERS;
  return parseFiltersFromUrl(window.location.search);
}
