import { useState } from "react";
import { ShieldCheck, FileText, Users, Tag, X } from "lucide-react";
import type { TeamMember } from "../../lib/api.js";

interface Props {
  count: number;
  owners: ReadonlyArray<TeamMember>;
  onAssignOwner: (ownerId: string) => Promise<void> | void;
  onChangeTier: (tier: 1 | 2 | 3) => Promise<void> | void;
  onGeneratePackets: () => void;
  onShareWithAuditor: () => void;
  onClear: () => void;
}

export function BulkActionBar({
  count,
  owners,
  onAssignOwner,
  onChangeTier,
  onGeneratePackets,
  onShareWithAuditor,
  onClear,
}: Props): JSX.Element | null {
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [tierOpen, setTierOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (count === 0) return null;

  const handleOwner = async (id: string) => {
    setOwnerOpen(false);
    setBusy(true);
    try {
      await onAssignOwner(id);
    } finally {
      setBusy(false);
    }
  };
  const handleTier = async (t: 1 | 2 | 3) => {
    setTierOpen(false);
    setBusy(true);
    try {
      await onChangeTier(t);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="region"
      aria-label="Bulk actions"
      style={{
        position: "sticky",
        top: 48,
        zIndex: 20,
        background: "#0f172a",
        color: "#ffffff",
        borderRadius: 12,
        padding: "10px 14px",
        margin: "0 0 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        boxShadow: "0 8px 24px rgba(15,23,42,0.18)",
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 500 }}>
        {count} selected
      </span>
      <span aria-hidden="true" style={{ color: "rgba(255,255,255,0.2)" }}>
        ·
      </span>

      <Menu
        open={ownerOpen}
        onOpenChange={setOwnerOpen}
        label="Assign owner"
        icon={<Users size={13} aria-hidden="true" />}
        disabled={busy}
      >
        {owners.map((o) => (
          <MenuItem key={o.id} onClick={() => void handleOwner(o.id)}>
            {o.name}
          </MenuItem>
        ))}
      </Menu>

      <Menu
        open={tierOpen}
        onOpenChange={setTierOpen}
        label="Change tier"
        icon={<Tag size={13} aria-hidden="true" />}
        disabled={busy}
      >
        <MenuItem onClick={() => void handleTier(1)}>Tier 1</MenuItem>
        <MenuItem onClick={() => void handleTier(2)}>Tier 2</MenuItem>
        <MenuItem onClick={() => void handleTier(3)}>Tier 3</MenuItem>
      </Menu>

      <BarButton onClick={onGeneratePackets} disabled={busy}>
        <FileText size={13} aria-hidden="true" /> Renegotiation packets
      </BarButton>

      <BarButton onClick={onShareWithAuditor} disabled={busy}>
        <ShieldCheck size={13} aria-hidden="true" /> Share with auditor
      </BarButton>

      <button
        type="button"
        onClick={onClear}
        aria-label="Clear selection"
        style={{
          marginLeft: "auto",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.2)",
          color: "rgba(255,255,255,0.8)",
          padding: "6px 10px",
          borderRadius: 6,
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        <X size={12} aria-hidden="true" /> Cancel
      </button>
    </div>
  );
}

function BarButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "6px 10px",
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "#ffffff",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

interface MenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  children: React.ReactNode;
}

function Menu({ open, onOpenChange, label, icon, disabled, children }: MenuProps): JSX.Element {
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        disabled={disabled}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "6px 10px",
          background: open ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "#ffffff",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 500,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
        }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {icon} {label} ▾
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            minWidth: 160,
            background: "#ffffff",
            color: "#0f172a",
            border: "1px solid rgba(15,23,42,0.08)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(15,23,42,0.18)",
            padding: 4,
            zIndex: 100,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "8px 10px",
        background: "transparent",
        border: "none",
        borderRadius: 6,
        fontSize: 13,
        cursor: "pointer",
        color: "#0f172a",
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#f8fafc")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
    >
      {children}
    </button>
  );
}
