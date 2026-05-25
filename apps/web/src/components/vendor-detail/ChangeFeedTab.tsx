import { useEffect, useState } from "react";
import { Activity, CheckSquare } from "lucide-react";
import type { ChangeCategory, Materiality } from "@unsyphn/shared";
import { DEMO_BEARER_TOKEN } from "../../lib/api.js";
import { DiffViewer } from "../DiffViewer.js";

interface FeedChange {
  id: string;
  vendorId: string;
  title: string;
  summary: string;
  severity: string;
  occurredAt: string;
  category: string;
  diff?: { before: string; after: string };
  citations?: Array<{ url?: string; fetchedAt?: string }>;
}

export function ChangeFeedTab({ vendorId }: { vendorId: string }): JSX.Element {
  const [changes, setChanges] = useState<FeedChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/v1/changes/feed?vendorId=${encodeURIComponent(vendorId)}`, {
      headers: { Authorization: `Bearer ${DEMO_BEARER_TOKEN}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ changes: FeedChange[] }>;
      })
      .then(({ changes: data }) => {
        if (!cancelled) {
          setChanges(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load change feed.");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  if (loading)
    return (
      <div style={{ padding: "var(--space-4)", color: "var(--text-muted)", fontSize: "var(--text-sm)" }} aria-live="polite" aria-busy>
        Loading changes…
      </div>
    );
  if (error) return <span className="badge badge-danger">{error}</span>;
  if (changes.length === 0)
    return (
      <div className="card glass-soft fade-up" style={{ padding: "var(--space-7)", textAlign: "center" }}>
        <CheckSquare size={24} aria-hidden="true" style={{ color: "var(--success)", display: "block", margin: "0 auto var(--space-2)" }} />
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-2)" }}>
          No material changes detected. Continuous monitoring is active.
        </p>
      </div>
    );

  const mapped = changes.map((ch) => {
    const out: {
      id: string;
      category: ChangeCategory;
      summary: string;
      before?: string;
      after?: string;
      materiality: Materiality;
      citations?: Array<{ url?: string; fetchedAt?: string }>;
    } = {
      id: ch.id,
      category: ch.category as ChangeCategory,
      summary: ch.title,
      materiality: (ch.severity === "P1" ? "material" : ch.severity === "P2" ? "minor" : "cosmetic") as Materiality,
    };
    if (ch.diff?.before !== undefined) out.before = ch.diff.before;
    if (ch.diff?.after !== undefined) out.after = ch.diff.after;
    if (ch.citations) out.citations = ch.citations.map((c) => ({ url: c.url, fetchedAt: c.fetchedAt }));
    return out;
  });

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-1)" }}>
        <Activity size={14} aria-hidden="true" style={{ color: "var(--success)" }} />
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          Continuous monitoring active · {changes.length} change{changes.length !== 1 ? "s" : ""} detected
        </span>
      </div>
      <DiffViewer changes={mapped} />
    </div>
  );
}
