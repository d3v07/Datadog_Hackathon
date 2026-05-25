import type { InboxItem } from "@unsyphn/shared";
import { MaterialChangeCard } from "../MaterialChangeCard.js";

interface DayGroup {
  bucket: string;
  label: string;
  items: InboxItem[];
}

interface InboxListProps {
  dayGroups: DayGroup[];
  focusedIndex: number;
  selectedIds: Set<string>;
  readIds: Set<string>;
  escalatedIds: Set<string>;
  /** Called with the global flat index and the ref element for keyboard nav. */
  registerRowRef: (idx: number, el: HTMLDivElement | null) => void;
  onFocus: (idx: number) => void;
  onClickItem: (item: InboxItem) => void;
  onToggleSelect: (id: string) => void;
  onSnooze: (item: InboxItem) => void;
  onArchive: (item: InboxItem) => void;
  onEscalate: (item: InboxItem) => void;
  /** Start offset for flat index counting — must match parent's accumulated count. */
  flatIndexOffset: number;
}

export function InboxList({
  dayGroups,
  focusedIndex,
  selectedIds,
  readIds,
  escalatedIds,
  registerRowRef,
  onFocus,
  onClickItem,
  onToggleSelect,
  onSnooze,
  onArchive,
  onEscalate,
  flatIndexOffset,
}: InboxListProps): JSX.Element {
  let localFlatIndex = flatIndexOffset - 1;

  return (
    <>
      {dayGroups.map((group) => (
        <section key={group.bucket} aria-label={group.label} style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 10.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#64748b",
              fontWeight: 600,
              marginBottom: 8,
              marginTop: 8,
              paddingLeft: 8,
            }}
          >
            {group.label} · {group.items.length}
          </div>
          <div
            className="card"
            style={{ padding: 0, overflow: "hidden" }}
            role="list"
            aria-label={`${group.label} items`}
          >
            {group.items.map((item, idxInGroup) => {
              localFlatIndex += 1;
              const idx = localFlatIndex;
              const unread = item.state === "new" && !readIds.has(item.id);
              const isFirst = idxInGroup === 0;
              const isLast = idxInGroup === group.items.length - 1;
              return (
                <div
                  key={item.id}
                  role="listitem"
                  ref={(el) => registerRowRef(idx, el as HTMLDivElement | null)}
                >
                  <MaterialChangeCard
                    item={item}
                    focused={focusedIndex === idx}
                    selected={selectedIds.has(item.id)}
                    unread={unread}
                    escalated={escalatedIds.has(item.id)}
                    showCheckbox={selectedIds.size > 0}
                    isFirst={isFirst}
                    isLast={isLast}
                    onClick={() => onClickItem(item)}
                    onFocus={() => onFocus(idx)}
                    onToggleSelect={() => onToggleSelect(item.id)}
                    onSnooze={() => onSnooze(item)}
                    onArchive={() => onArchive(item)}
                    onEscalate={() => onEscalate(item)}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
