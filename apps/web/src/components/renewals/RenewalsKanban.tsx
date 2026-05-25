import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Renewal, RenewalStatus } from "@unsyphn/shared";
import type { TeamMember } from "../../lib/api.js";
import { RenewalCard } from "./RenewalCard.js";

const COLUMN_LABELS: Record<RenewalStatus, string> = {
  triage: "Triage",
  negotiate: "Negotiate",
  sign: "Sign",
};

export const COLUMNS: RenewalStatus[] = ["triage", "negotiate", "sign"];

interface ColumnProps {
  status: RenewalStatus;
  renewals: ReadonlyArray<Renewal>;
  members: ReadonlyArray<TeamMember>;
  onOpen: (r: Renewal) => void;
  onAssignOwner: (id: string, ownerId: string) => void;
  onMarkDeclined: (id: string) => void;
  onMarkAutoRenewed: (id: string) => void;
  onReopen: (id: string) => void;
  onGeneratePacket: (r: Renewal) => void;
  onExportIcs: (r: Renewal) => void;
  activeId: string | null;
}

function KanbanColumn(props: ColumnProps): JSX.Element {
  const { status, renewals, activeId } = props;
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });
  const ids = useMemo(() => renewals.map((r) => r.id), [renewals]);

  return (
    <section
      aria-label={`${COLUMN_LABELS[status]} column`}
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          paddingBottom: "var(--space-2)",
          borderBottom: "2px solid var(--border)",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "var(--text-sm)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--text-2)",
          }}
        >
          {COLUMN_LABELS[status]}
        </h2>
        <span
          aria-label={`${renewals.length} renewals`}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            background: "var(--surface-2)",
            padding: "2px 8px",
            borderRadius: "var(--radius-full)",
          }}
        >
          {renewals.length}
        </span>
      </div>

      <SortableContext id={`col:${status}`} items={ids} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          aria-dropeffect="move"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
            minHeight: 120,
            borderRadius: "var(--radius-md)",
            background: isOver ? "var(--accent-soft)" : "transparent",
            outline: isOver ? "2px dashed var(--accent)" : "none",
            outlineOffset: -2,
            padding: isOver ? "var(--space-2)" : 0,
            transition: "background 120ms ease, padding 120ms ease",
          }}
        >
          {renewals.length === 0 ? (
            <p
              style={{
                margin: 0,
                fontSize: "var(--text-sm)",
                color: "var(--text-muted)",
                textAlign: "center",
                padding: "var(--space-6) var(--space-3)",
                border: "1px dashed var(--border)",
                borderRadius: "var(--radius-md)",
                background: "var(--surface-2)",
              }}
            >
              Drop renewals here
            </p>
          ) : (
            renewals.map((r) => (
              <RenewalCard
                key={r.id}
                renewal={r}
                members={props.members}
                onOpen={props.onOpen}
                onAssignOwner={props.onAssignOwner}
                onMarkDeclined={props.onMarkDeclined}
                onMarkAutoRenewed={props.onMarkAutoRenewed}
                onReopen={props.onReopen}
                onGeneratePacket={props.onGeneratePacket}
                onExportIcs={props.onExportIcs}
                draggable={!(r.declined || r.autoRenewed) && activeId !== r.id}
              />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  );
}

interface KanbanProps {
  renewals: ReadonlyArray<Renewal>;
  members: ReadonlyArray<TeamMember>;
  onMoveColumn: (id: string, column: RenewalStatus) => void;
  onOpen: (r: Renewal) => void;
  onAssignOwner: (id: string, ownerId: string) => void;
  onMarkDeclined: (id: string) => void;
  onMarkAutoRenewed: (id: string) => void;
  onReopen: (id: string) => void;
  onGeneratePacket: (r: Renewal) => void;
  onExportIcs: (r: Renewal) => void;
}

function parseColumnFrom(id: string | number): RenewalStatus | null {
  const s = String(id);
  if (s.startsWith("col:")) {
    const c = s.slice(4);
    if (c === "triage" || c === "negotiate" || c === "sign") return c;
  }
  return null;
}

export function RenewalsKanban({
  renewals,
  members,
  onMoveColumn,
  onOpen,
  onAssignOwner,
  onMarkDeclined,
  onMarkAutoRenewed,
  onReopen,
  onGeneratePacket,
  onExportIcs,
}: KanbanProps): JSX.Element {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const byStatus = useMemo(() => {
    const map: Record<RenewalStatus, Renewal[]> = { triage: [], negotiate: [], sign: [] };
    for (const r of renewals) {
      if (r.declined || r.autoRenewed) continue;
      if (r.status === "triage" || r.status === "negotiate" || r.status === "sign") {
        map[r.status].push(r);
      }
    }
    for (const k of COLUMNS) map[k].sort((a, b) => a.daysOut - b.daysOut);
    return map;
  }, [renewals]);

  const renewalById = useMemo(() => {
    const m = new Map<string, Renewal>();
    for (const r of renewals) m.set(r.id, r);
    return m;
  }, [renewals]);

  const activeRenewal = activeId ? renewalById.get(activeId) ?? null : null;

  const handleStart = (e: DragStartEvent): void => {
    setActiveId(String(e.active.id));
  };

  const handleEnd = (e: DragEndEvent): void => {
    setActiveId(null);
    if (!e.over) return;

    const draggedId = String(e.active.id);
    const dragged = renewalById.get(draggedId);
    if (!dragged) return;

    // Drop target is either a column droppable ("col:<status>") or another card.
    let target = parseColumnFrom(e.over.id);
    if (!target) {
      // SortableContext id is set per column as "col:<status>".
      const containerId = (e.over.data.current?.["sortable"] as { containerId?: string } | undefined)
        ?.containerId;
      if (containerId) target = parseColumnFrom(containerId);
    }
    if (!target) return;
    if (target === dragged.status) return;
    onMoveColumn(draggedId, target);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleStart}
      onDragEnd={handleEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--space-5)",
          alignItems: "start",
        }}
      >
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col}
            status={col}
            renewals={byStatus[col]}
            members={members}
            onOpen={onOpen}
            onAssignOwner={onAssignOwner}
            onMarkDeclined={onMarkDeclined}
            onMarkAutoRenewed={onMarkAutoRenewed}
            onReopen={onReopen}
            onGeneratePacket={onGeneratePacket}
            onExportIcs={onExportIcs}
            activeId={activeId}
          />
        ))}
      </div>

      <DragOverlay>
        {activeRenewal ? (
          <div style={{ opacity: 0.9, transform: "rotate(-1deg)" }}>
            <RenewalCard
              renewal={activeRenewal}
              members={members}
              onOpen={onOpen}
              onAssignOwner={onAssignOwner}
              onMarkDeclined={onMarkDeclined}
              onMarkAutoRenewed={onMarkAutoRenewed}
              onReopen={onReopen}
              onGeneratePacket={onGeneratePacket}
              onExportIcs={onExportIcs}
              draggable={false}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
