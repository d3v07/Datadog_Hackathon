import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Clock, Download, FileText, RefreshCw } from "lucide-react";
import {
  generateReport,
  listReports,
  type Report,
  type ReportCategory,
} from "../lib/api.js";
import { LensChips } from "../components/LensChips.js";
import { SkeletonCard } from "../components/SkeletonRow.js";

const CATEGORY_LABEL: Record<ReportCategory, string> = {
  risk: "Risk",
  compliance: "Compliance",
  spend: "Spend",
  operational: "Operational",
};

function fmtRelative(iso: string | undefined): string {
  if (!iso) return "Never";
  const diff = Date.now() - Date.parse(iso);
  if (Number.isNaN(diff)) return "Unknown";
  const day = 86_400_000;
  if (diff < day) return "Today";
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`;
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))} weeks ago`;
  return `${Math.floor(diff / (30 * day))} months ago`;
}

function fmtFuture(iso: string | undefined): string {
  if (!iso) return "On demand";
  const diff = Date.parse(iso) - Date.now();
  if (Number.isNaN(diff)) return iso;
  if (diff <= 0) return "Now";
  const day = 86_400_000;
  if (diff < day) return "Today";
  if (diff < 7 * day) return `In ${Math.ceil(diff / day)} day${diff < 2 * day ? "" : "s"}`;
  if (diff < 30 * day) return `In ${Math.ceil(diff / (7 * day))} weeks`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ScheduleChip({ schedule }: { schedule: Report["schedule"] }): JSX.Element {
  const label =
    schedule === "monthly"
      ? "Monthly"
      : schedule === "weekly"
        ? "Weekly"
        : schedule === "quarterly"
          ? "Quarterly"
          : "On demand";
  return (
    <span className="badge badge-neutral" style={{ textTransform: "none" }}>
      {label}
    </span>
  );
}

function CategoryBadge({ category }: { category: ReportCategory }): JSX.Element {
  return (
    <span className="badge badge-accent" style={{ textTransform: "none" }}>
      {CATEGORY_LABEL[category]}
    </span>
  );
}

interface CardProps {
  report: Report;
  busy: boolean;
  onGenerate: (id: string) => void;
}

function ReportCard({ report, busy, onGenerate }: CardProps): JSX.Element {
  return (
    <article
      className="card glass-strong lift-on-hover"
      style={{
        padding: "var(--space-5)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <FileText size={16} aria-hidden="true" style={{ color: "var(--accent)" }} />
        <h3
          style={{
            margin: 0,
            fontSize: "var(--text-base)",
            fontWeight: 600,
            color: "var(--text-strong)",
            flex: 1,
          }}
        >
          {report.name}
        </h3>
        <CategoryBadge category={report.category} />
        <ScheduleChip schedule={report.schedule} />
        {report.isCompliancePack && (
          <span className="badge badge-success" style={{ textTransform: "none" }}>
            Compliance pack
          </span>
        )}
      </div>

      <p
        style={{
          margin: 0,
          fontSize: "var(--text-sm)",
          color: "var(--text-2)",
          lineHeight: 1.5,
        }}
      >
        {report.description}
      </p>

      <div
        style={{
          display: "flex",
          gap: "var(--space-4)",
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
          flexWrap: "wrap",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Clock size={12} aria-hidden="true" /> Last generated {fmtRelative(report.lastGeneratedAt)}
        </span>
        {report.schedule !== "on-demand" && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Calendar size={12} aria-hidden="true" /> Next run {fmtFuture(report.nextRunAt)}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "auto", flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn-primary button-pop"
          onClick={() => onGenerate(report.id)}
          disabled={busy}
          style={{ fontSize: "var(--text-sm)" }}
        >
          <RefreshCw size={13} aria-hidden="true" className={busy ? "spin" : ""} />
          {busy ? "Generating…" : "Generate now"}
        </button>
        {report.downloadUrl && (
          <a
            href={report.downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary button-pop"
            style={{ fontSize: "var(--text-sm)", textDecoration: "none" }}
          >
            <Download size={13} aria-hidden="true" />
            Download latest
          </a>
        )}
      </div>
    </article>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }): JSX.Element {
  return (
    <h2
      style={{
        margin: "0 0 var(--space-4)",
        fontSize: "var(--text-base)",
        fontWeight: 600,
        color: "var(--text-strong)",
        display: "flex",
        alignItems: "baseline",
        gap: 8,
      }}
    >
      {title}
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 400 }}>
        {count}
      </span>
    </h2>
  );
}

export function Reports(): JSX.Element {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const flashToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listReports()
      .then((resp) => {
        if (cancelled) return;
        setReports(resp.reports);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Couldn't load reports.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGenerate = useCallback(
    async (id: string) => {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      flashToast("Report generating…");
      try {
        const updated = await generateReport(id);
        setReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
        flashToast(`Generated ${updated.name}`);
      } catch {
        flashToast("Couldn't generate report.");
      } finally {
        setBusyIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [flashToast],
  );

  const { scheduled, onDemand } = useMemo(() => {
    const sched: Report[] = [];
    const demand: Report[] = [];
    for (const r of reports) {
      if (r.schedule === "on-demand") demand.push(r);
      else sched.push(r);
    }
    return { scheduled: sched, onDemand: demand };
  }, [reports]);

  return (
    <main
      className="page"
      style={{ padding: "var(--space-7) var(--space-6)", maxWidth: 1100, margin: "0 auto" }}
    >
      <header className="fade-up" style={{ marginBottom: "var(--space-6)" }}>
        <h1 className="h1" style={{ marginBottom: "var(--space-2)" }}>
          Reports
        </h1>
        <p className="lead" style={{ margin: 0, color: "var(--text-2)" }}>
          Scheduled and on-demand evidence. Generate fresh bundles for auditors, finance, and leadership.
        </p>
      </header>

      <LensChips />

      {loading && (
        <div
          className="stagger-children"
          aria-busy="true"
          aria-label="Loading reports"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "var(--space-4)",
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} height={200} bars={3} />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="card glass-soft fade-up" style={{ padding: 16 }}>
          <span className="badge badge-danger">{error}</span>
        </div>
      )}

      {!loading && !error && reports.length === 0 && (
        <div className="card glass-soft fade-up" style={{ padding: "var(--space-9)", textAlign: "center", color: "var(--text-2)" }}>
          No reports configured yet.
        </div>
      )}

      {!loading && !error && scheduled.length > 0 && (
        <section aria-labelledby="reports-scheduled" className="fade-up" style={{ marginBottom: "var(--space-7)" }}>
          <SectionHeader title="Scheduled" count={scheduled.length} />
          <div
            className="stagger-children"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "var(--space-4)",
            }}
          >
            {scheduled.map((r) => (
              <ReportCard
                key={r.id}
                report={r}
                busy={busyIds.has(r.id)}
                onGenerate={handleGenerate}
              />
            ))}
          </div>
        </section>
      )}

      {!loading && !error && onDemand.length > 0 && (
        <section aria-labelledby="reports-on-demand" className="fade-up">
          <SectionHeader title="On-demand" count={onDemand.length} />
          <div
            className="stagger-children"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "var(--space-4)",
            }}
          >
            {onDemand.map((r) => (
              <ReportCard
                key={r.id}
                report={r}
                busy={busyIds.has(r.id)}
                onGenerate={handleGenerate}
              />
            ))}
          </div>
        </section>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--text)",
            color: "var(--surface)",
            padding: "var(--space-2) var(--space-4)",
            borderRadius: "var(--radius-pill)",
            fontSize: "var(--text-sm)",
            fontWeight: 500,
            zIndex: 500,
            pointerEvents: "none",
          }}
        >
          {toast}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </main>
  );
}
