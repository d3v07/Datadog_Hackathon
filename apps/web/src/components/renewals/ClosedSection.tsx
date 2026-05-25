import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Renewal } from "@unsyphn/shared";
import type { TeamMember } from "../../lib/api.js";
import { RenewalCard } from "./RenewalCard.js";

interface Props {
  renewals: ReadonlyArray<Renewal>;
  members: ReadonlyArray<TeamMember>;
  onOpen: (r: Renewal) => void;
  onAssignOwner: (id: string, ownerId: string) => void;
  onMarkDeclined: (id: string) => void;
  onMarkAutoRenewed: (id: string) => void;
  onReopen: (id: string) => void;
  onGeneratePacket: (r: Renewal) => void;
  onExportIcs: (r: Renewal) => void;
}

export function ClosedSection({
  renewals,
  members,
  onOpen,
  onAssignOwner,
  onMarkDeclined,
  onMarkAutoRenewed,
  onReopen,
  onGeneratePacket,
  onExportIcs,
}: Props): JSX.Element | null {
  const [expanded, setExpanded] = useState(false);
  if (renewals.length === 0) return null;

  const declined = renewals.filter((r) => r.declined).length;
  const auto = renewals.filter((r) => r.autoRenewed).length;

  return (
    <section
      aria-label="Closed renewals"
      style={{
        marginTop: "var(--space-7)",
        paddingTop: "var(--space-5)",
        borderTop: "1px solid var(--border)",
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls="closed-renewals-grid"
        className="btn btn-ghost button-pop"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          padding: "var(--space-2) var(--space-3)",
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          color: "var(--text-2)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {expanded ? (
          <ChevronDown size={14} aria-hidden="true" />
        ) : (
          <ChevronRight size={14} aria-hidden="true" />
        )}
        Closed ({renewals.length})
        {declined > 0 && (
          <span className="badge badge-neutral" style={{ fontSize: "var(--text-xs)" }}>
            {declined} declined
          </span>
        )}
        {auto > 0 && (
          <span className="badge badge-success" style={{ fontSize: "var(--text-xs)" }}>
            {auto} auto-renewed
          </span>
        )}
      </button>

      {expanded && (
        <div
          id="closed-renewals-grid"
          className="stagger-children"
          style={{
            marginTop: "var(--space-3)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "var(--space-3)",
          }}
        >
          {renewals.map((r) => (
            <RenewalCard
              key={r.id}
              renewal={r}
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
          ))}
        </div>
      )}
    </section>
  );
}
