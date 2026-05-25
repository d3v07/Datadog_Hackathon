import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreHorizontal, GripVertical, CalendarPlus } from "lucide-react";
import type { Renewal, RenewalStatus } from "@unsyphn/shared";
import { VendorLogo } from "../VendorLogo.js";
import type { TeamMember } from "../../lib/api.js";

const STATUS_BADGE: Record<RenewalStatus, string> = {
  triage: "badge badge-warning",
  negotiate: "badge badge-accent",
  sign: "badge badge-success",
};

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initialsFor(member: TeamMember | undefined, fallback: string): string {
  if (member?.avatarLetter) return member.avatarLetter;
  if (member?.name) return member.name.charAt(0).toUpperCase();
  return fallback.charAt(0).toUpperCase();
}

interface OwnerAvatarProps {
  renewal: Renewal;
  members: ReadonlyArray<TeamMember>;
  onAssign: (ownerId: string) => void;
  disabled?: boolean;
}

function OwnerAvatar({ renewal, members, onAssign, disabled }: OwnerAvatarProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent): void => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const currentMember = members.find(
    (m) => m.id === renewal.ownerId || m.email === renewal.ownerEmail,
  );
  const initials = initialsFor(currentMember, renewal.ownerEmail);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setOpen((v) => !v);
        }}
        aria-label={`Owner: ${currentMember?.name ?? renewal.ownerEmail}. Click to reassign`}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={currentMember?.email ?? renewal.ownerEmail}
        disabled={disabled}
        style={{
          width: 28,
          height: 28,
          borderRadius: "var(--radius-full)",
          background: "var(--accent-soft)",
          border: "1px solid var(--border)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "var(--text-xs)",
          fontWeight: 600,
          color: "var(--accent)",
          flexShrink: 0,
          cursor: disabled ? "default" : "pointer",
          padding: 0,
        }}
      >
        {initials}
      </button>

      {open && (
        <div
          ref={popRef}
          role="listbox"
          aria-label="Assign owner"
          style={{
            position: "absolute",
            top: 32,
            left: 0,
            minWidth: 220,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-3)",
            zIndex: 50,
            padding: "var(--space-2)",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {members.length === 0 ? (
            <span
              style={{
                padding: "var(--space-2)",
                fontSize: "var(--text-xs)",
                color: "var(--text-muted)",
              }}
            >
              No team members available
            </span>
          ) : (
            members.map((m) => {
              const isSelected = m.id === renewal.ownerId || m.email === renewal.ownerEmail;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setOpen(false);
                    onAssign(m.id);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 8px",
                    background: isSelected ? "var(--accent-soft)" : "transparent",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    fontSize: "var(--text-xs)",
                    color: "var(--text)",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "var(--radius-full)",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    {initialsFor(m, m.email)}
                  </span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{m.name}</span>
                  <span style={{ color: "var(--text-muted)" }}>{m.role}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export interface CardAction {
  key: "decline" | "auto" | "open" | "packet" | "export" | "reopen";
  label: string;
  onSelect: () => void;
}

interface KebabMenuProps {
  actions: ReadonlyArray<CardAction>;
}

function KebabMenu({ actions }: KebabMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Card actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="btn btn-ghost"
        style={{ width: 28, height: 28, padding: 0 }}
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: "absolute",
            top: 30,
            right: 0,
            minWidth: 200,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-3)",
            zIndex: 50,
            padding: "var(--space-1)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {actions.map((a) => (
            <button
              key={a.key}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                a.onSelect();
              }}
              style={{
                padding: "8px 10px",
                background: "transparent",
                border: "none",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontSize: "var(--text-xs)",
                color: "var(--text)",
                textAlign: "left",
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export interface RenewalCardProps {
  renewal: Renewal;
  members: ReadonlyArray<TeamMember>;
  onOpen: (r: Renewal) => void;
  onAssignOwner: (id: string, ownerId: string) => void;
  onMarkDeclined: (id: string) => void;
  onMarkAutoRenewed: (id: string) => void;
  onReopen: (id: string) => void;
  onGeneratePacket: (r: Renewal) => void;
  onExportIcs: (r: Renewal) => void;
  draggable?: boolean;
}

function statusLabel(r: Renewal): { label: string; cls: string } {
  if (r.declined) return { label: "declined", cls: "badge badge-neutral" };
  if (r.autoRenewed) return { label: "auto-renewed", cls: "badge badge-success" };
  return { label: r.status, cls: STATUS_BADGE[r.status] };
}

export function RenewalCard({
  renewal,
  members,
  onOpen,
  onAssignOwner,
  onMarkDeclined,
  onMarkAutoRenewed,
  onReopen,
  onGeneratePacket,
  onExportIcs,
  draggable = true,
}: RenewalCardProps): JSX.Element {
  const sortable = useSortable({ id: renewal.id, disabled: !draggable });
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = sortable;

  const delta = renewal.benchmarkDelta;
  const deltaColor =
    delta === null ? "var(--text-muted)" : delta > 0 ? "var(--danger)" : "var(--success)";
  const deltaLabel =
    delta === null ? "+0% vs market" : `${delta > 0 ? "+" : ""}${delta}% vs market`;

  const { label: statusText, cls: statusCls } = statusLabel(renewal);
  const closed = renewal.declined || renewal.autoRenewed;

  const actions: CardAction[] = closed
    ? [
        { key: "reopen", label: "Re-open", onSelect: () => onReopen(renewal.id) },
        { key: "open", label: "Open workbench", onSelect: () => onOpen(renewal) },
        { key: "packet", label: "Generate packet", onSelect: () => onGeneratePacket(renewal) },
        { key: "export", label: "Export to calendar", onSelect: () => onExportIcs(renewal) },
      ]
    : [
        { key: "open", label: "Open workbench", onSelect: () => onOpen(renewal) },
        { key: "packet", label: "Generate packet", onSelect: () => onGeneratePacket(renewal) },
        { key: "decline", label: "Mark declined", onSelect: () => onMarkDeclined(renewal.id) },
        { key: "auto", label: "Mark auto-renewed", onSelect: () => onMarkAutoRenewed(renewal.id) },
        { key: "export", label: "Export to calendar", onSelect: () => onExportIcs(renewal) },
      ];

  return (
    <article
      ref={setNodeRef}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        boxShadow: isDragging ? "var(--shadow-3)" : "var(--shadow-1)",
        cursor: closed ? "default" : "grab",
        position: "relative",
      }}
      {...attributes}
      aria-roledescription={draggable ? "Sortable renewal card" : undefined}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        {draggable && (
          <span
            {...listeners}
            aria-label={`Drag ${renewal.vendorName} between columns`}
            role="button"
            tabIndex={0}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 18,
              height: 18,
              color: "var(--text-muted)",
              cursor: "grab",
              flexShrink: 0,
            }}
          >
            <GripVertical size={14} aria-hidden="true" />
          </span>
        )}
        <VendorLogo name={renewal.vendorName} size={24} />
        <span
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: "var(--text)",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {renewal.vendorName}
        </span>
        <span className={statusCls} style={{ fontSize: "var(--text-xs)" }}>
          {statusText}
        </span>
      </div>

      <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-2)" }}>
        Renews in {renewal.daysOut}d · {formatDate(renewal.renewsAt)}
      </p>

      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-lg)",
          fontWeight: 700,
          color: "var(--text)",
          letterSpacing: "-0.01em",
        }}
      >
        {formatUsd(renewal.annualValueUsd)}
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            fontWeight: 500,
            marginLeft: 4,
          }}
        >
          /yr
        </span>
      </p>

      <p style={{ margin: 0, fontSize: "var(--text-xs)", fontWeight: 600, color: deltaColor }}>
        {deltaLabel}
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "var(--space-1)",
        }}
      >
        <OwnerAvatar
          renewal={renewal}
          members={members}
          onAssign={(ownerId) => onAssignOwner(renewal.id, ownerId)}
          disabled={closed}
        />
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            type="button"
            aria-label="Export this renewal to calendar"
            title="Export to calendar"
            className="btn btn-ghost"
            onClick={() => onExportIcs(renewal)}
            style={{ width: 28, height: 28, padding: 0 }}
          >
            <CalendarPlus size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ height: 28, fontSize: "var(--text-xs)" }}
            onClick={() => onOpen(renewal)}
          >
            Open
          </button>
          <KebabMenu actions={actions} />
        </div>
      </div>
    </article>
  );
}
