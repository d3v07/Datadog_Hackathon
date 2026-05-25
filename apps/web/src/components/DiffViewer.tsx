import type { Change } from "@unsyphn/shared";

interface Props {
  changes: Change[];
}

const CATEGORY_LABEL: Record<string, string> = {
  data: "Data",
  pricing: "Pricing",
  subprocessor: "Sub-processor",
  terms: "Terms",
  sla: "SLA",
  security: "Security",
};

const MATERIALITY_CLASS: Record<string, string> = {
  material: "badge badge-danger",
  minor: "badge badge-warning",
  cosmetic: "badge badge-neutral",
};

function ChangeCard({ change }: { change: Change }): JSX.Element {
  const categoryLabel = change.category ? (CATEGORY_LABEL[change.category] ?? change.category) : null;
  const materialityClass = change.materiality
    ? (MATERIALITY_CLASS[change.materiality] ?? "badge badge-neutral")
    : "badge badge-neutral";

  return (
    <div
      className="card"
      style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
    >
      {/* Category + materiality row */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
        {categoryLabel && (
          <span className="badge badge-neutral" style={{ textTransform: "lowercase", letterSpacing: 0 }}>
            {categoryLabel}
          </span>
        )}
        {change.materiality && (
          <span className={materialityClass}>
            {change.materiality} materiality
          </span>
        )}
      </div>

      {/* Summary */}
      <h4
        style={{
          margin: 0,
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          color: "var(--text)",
          lineHeight: 1.4,
        }}
      >
        {change.summary}
      </h4>

      {/* Before / After */}
      {(change.before !== undefined || change.after !== undefined) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--space-2)",
          }}
          className="diff-grid"
        >
          {change.before !== undefined && (
            <div
              style={{
                borderLeft: "3px solid var(--warning)",
                paddingLeft: "var(--space-3)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-1)",
              }}
            >
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--warning)",
                }}
              >
                Before
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  color: "var(--text-2)",
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                }}
              >
                {change.before}
              </span>
            </div>
          )}
          {change.after !== undefined && (
            <div
              style={{
                borderLeft: "3px solid var(--success)",
                paddingLeft: "var(--space-3)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-1)",
              }}
            >
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--success)",
                }}
              >
                After
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  color: "var(--text-2)",
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                }}
              >
                {change.after}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Citations */}
      {change.citations && change.citations.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
          {change.citations.map((cite, i) => {
            const url = cite.url ?? cite.sourceUrl;
            const date = cite.fetchedAt
              ? new Date(cite.fetchedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
              : null;
            return (
              <span
                key={i}
                style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", lineHeight: 1.4 }}
              >
                Citation:{" "}
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Citation source (opens in new tab)`}
                    style={{ color: "var(--accent)", textDecoration: "underline" }}
                  >
                    {url.replace(/^https?:\/\//, "").split("/")[0]}
                  </a>
                ) : (
                  cite.section ?? cite.label ?? "Source"
                )}
                {date && ` · ${date}`}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DiffViewer({ changes }: Props): JSX.Element {
  if (changes.length === 0) {
    return (
      <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", margin: 0 }}>
        No diff data available.
      </p>
    );
  }

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
      aria-label="Change diff viewer"
    >
      {changes.map((change, i) => (
        <ChangeCard key={change.id ?? i} change={change} />
      ))}
    </div>
  );
}
