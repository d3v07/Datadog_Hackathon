import type { InboxItem } from "@unsyphn/shared";

export type DayBucket = "today" | "yesterday" | "earlier" | "older";

export const BUCKET_LABEL: Record<DayBucket, string> = {
  today: "Today",
  yesterday: "Yesterday",
  earlier: "Earlier this week",
  older: "Older",
};

export const BUCKET_ORDER: DayBucket[] = ["today", "yesterday", "earlier", "older"];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function bucketFor(iso: string, now: Date = new Date()): DayBucket {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "older";

  const itemDay = startOfDay(new Date(t));
  const today = startOfDay(now);
  const dayDiff = Math.round((today.getTime() - itemDay.getTime()) / 86_400_000);

  if (dayDiff <= 0) return "today";
  if (dayDiff === 1) return "yesterday";
  if (dayDiff <= 7) return "earlier";
  return "older";
}

export interface DayGroup {
  bucket: DayBucket;
  label: string;
  items: InboxItem[];
}

export function groupByDay(items: InboxItem[], now: Date = new Date()): DayGroup[] {
  const map = new Map<DayBucket, InboxItem[]>();
  for (const item of items) {
    const b = bucketFor(item.occurredAt, now);
    const arr = map.get(b) ?? [];
    map.set(b, [...arr, item]);
  }
  return BUCKET_ORDER.flatMap((b) => {
    const list = map.get(b);
    if (!list || list.length === 0) return [];
    return [{ bucket: b, label: BUCKET_LABEL[b], items: list }];
  });
}
