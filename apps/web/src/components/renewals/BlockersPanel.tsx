import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { DEMO_BEARER_TOKEN } from "../../lib/api.js";

interface ChangeBlocker {
  id: string;
  title: string;
  severity: string;
}

interface FeedResponse {
  changes?: ChangeBlocker[];
}

function SectionHead({ label }: { label: string }): JSX.Element {
  return (
    <span
      style={{
        display: "block",
        fontSize: "var(--text-xs)",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        color: "var(--text-2)",
        marginBottom: "var(--space-2)",
      }}
    >
      {label}
    </span>
  );
}

export function BlockersPanel({ vendorId }: { vendorId: string }): JSX.Element {
  const [blockers, setBlockers] = useState<ChangeBlocker[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/v1/changes/feed?vendorId=${encodeURIComponent(vendorId)}`, {
      headers: { Authorization: `Bearer ${DEMO_BEARER_TOKEN}` },
    })
      .then((r) => (r.ok ? (r.json() as Promise<FeedResponse>) : null))
      .then((d: FeedResponse | null) => {
        if (cancelled) return;
        const items = (d?.changes ?? []).filter((i) => i.severity === "P1");
        setBlockers(items);
      })
      .catch(() => {
        if (!cancelled) setBlockers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  return (
    <section aria-labelledby="wb-blockers">
      <SectionHead label="Legal / Risk blockers" />
      {blockers === null ? (
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Checking…</p>
      ) : blockers.length === 0 ? (
        <p
          style={{
            margin: 0,
            fontSize: "var(--text-sm)",
            color: "var(--success)",
            fontWeight: 500,
          }}
        >
          No blockers. Clear to negotiate.
        </p>
      ) : (
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          {blockers.map((b) => (
            <li key={b.id}>
              <a
                href={`/app/findings?vendorId=${encodeURIComponent(vendorId)}&type=change&severity=P1`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  padding: "var(--space-2) var(--space-3)",
                  background: "var(--surface-2)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "var(--text-sm)",
                  color: "var(--text-2)",
                  textDecoration: "none",
                }}
                aria-label={`View finding: ${b.title}`}
              >
                <AlertCircle size={14} color="var(--danger)" aria-hidden="true" />
                {b.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
