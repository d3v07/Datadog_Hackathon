import { useState } from "react";
import { ROUTE_TARGETS, type RouteTarget } from "./types.js";

interface Props {
  busy?: boolean;
  onSubmit: (target: RouteTarget, note?: string) => Promise<void> | void;
  onCancel: () => void;
}

const TARGET_LABELS: Record<RouteTarget, string> = {
  legal: "Legal",
  security: "Security",
  finance: "Finance",
  procurement: "Procurement",
  it: "IT",
  audit: "Audit",
};

export function RouteForReviewPanel({ busy, onSubmit, onCancel }: Props): JSX.Element {
  const [target, setTarget] = useState<RouteTarget>("legal");
  const [note, setNote] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const trimmed = note.trim();
    await onSubmit(target, trimmed.length > 0 ? trimmed : undefined);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-3) var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "var(--text-xs)", color: "var(--text-2)" }}>
          Route to
          <select
            className="input focus-glow"
            value={target}
            onChange={(e) => setTarget(e.target.value as RouteTarget)}
            style={{ height: 34, minWidth: 160 }}
          >
            {ROUTE_TARGETS.map((t) => (
              <option key={t} value={t}>{TARGET_LABELS[t]}</option>
            ))}
          </select>
        </label>
        <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, fontSize: "var(--text-xs)", color: "var(--text-2)", minWidth: 200 }}>
          Note (optional)
          <input
            className="input focus-glow"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why does this need review?"
            style={{ height: 34 }}
          />
        </label>
      </div>
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <button type="submit" className="btn btn-primary button-pop" disabled={busy} style={{ height: 32, fontSize: "var(--text-xs)" }}>
          {busy ? "Routing..." : `Route to ${TARGET_LABELS[target]}`}
        </button>
        <button type="button" className="btn btn-ghost button-pop" onClick={onCancel} disabled={busy} style={{ height: 32, fontSize: "var(--text-xs)" }}>
          Cancel
        </button>
      </div>
    </form>
  );
}
