import { useEffect, useState } from "react";
import type {
  Change,
  Citation,
  EvidenceBriefResponse,
} from "@unsyphn/shared";
import { ApiError, getEvidence } from "../lib/api.js";
import "../styles/brief.css";

// Public evidence brief — locally hosted Senso fallback (handoff/API §07 F4).
// Intentionally has no app chrome, runs without bearer auth, and is laid out
// to print cleanly to PDF.

interface SensoBriefProps {
  changeReportId: string;
}

type Status = "loading" | "ready" | "not-found" | "error";

interface State {
  status: Status;
  data?: EvidenceBriefResponse;
  errorMessage?: string;
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toUTCString();
  } catch {
    return iso;
  }
}

function formatDollar(value: number): string {
  const abs = Math.abs(value);
  const sign = value >= 0 ? "+" : "−";
  return `${sign}$${abs.toLocaleString("en-US")}`;
}

export function SensoBrief({ changeReportId }: SensoBriefProps): JSX.Element {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    (async () => {
      try {
        const data = await getEvidence(changeReportId);
        if (!cancelled) setState({ status: "ready", data });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setState({ status: "not-found" });
          return;
        }
        setState({
          status: "error",
          errorMessage: err instanceof Error ? err.message : "Failed to load",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [changeReportId]);

  if (state.status === "loading") {
    return (
      <div className="brief" data-testid="brief-loading">
        <p>Loading evidence…</p>
      </div>
    );
  }

  if (state.status === "not-found") {
    return (
      <div className="brief brief--not-found" data-testid="brief-not-found">
        <h1>Evidence brief not found</h1>
        <p>
          The brief with id <code>{changeReportId}</code> does not exist or has
          been removed.
        </p>
      </div>
    );
  }

  if (state.status === "error" || !state.data) {
    return (
      <div className="brief brief--not-found" data-testid="brief-error">
        <h1>Unable to load brief</h1>
        <p>{state.errorMessage ?? "Unexpected error"}</p>
      </div>
    );
  }

  const { changeReport, vendor, policyFired, policyAlsoMatched, actionSummary } =
    state.data;

  const bundleUrl = `/v1/evidence/${encodeURIComponent(changeReportId)}/bundle.html`;

  return (
    <article className="brief" data-testid="brief" lang="en">
      <header className="brief__header">
        <p className="brief__eyebrow">Unsyphn · Evidence brief</p>
        <div className="brief__header-top">
          <span
            className={`brief__severity brief__severity--${changeReport.severity}`}
            data-testid="brief-severity"
          >
            {changeReport.severity} · {changeReport.state}
          </span>
          <a
            href={bundleUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-bundle"
            aria-label="Generate compliance bundle (opens in new tab)"
          >
            Generate Compliance Bundle
          </a>
        </div>
        <h1 className="brief__title" data-testid="brief-title">
          {vendor.name} · {changeReport.changes[0]?.summary ?? "Change detected"}
        </h1>
        <p className="brief__meta">
          Detected{" "}
          <strong data-testid="brief-detected-at">
            {formatTimestamp(changeReport.detectedAt)}
          </strong>{" "}
          · Vendor category <strong>{vendor.category}</strong>
        </p>
      </header>

      <section className="brief__section">
        <h2>Policy fired</h2>
        <div className="brief__policy" data-testid="brief-policy">
          <strong>{policyFired.name}</strong>
          <span className="brief__meta">{policyFired.id}</span>
          {policyAlsoMatched.length > 0 && (
            <p className="brief__policy-also">
              Also matched:{" "}
              {policyAlsoMatched.map((p) => p.name).join(" · ")}
            </p>
          )}
        </div>
      </section>

      <section className="brief__section">
        <h2>Recommendation</h2>
        <p>
          <strong>{changeReport.recommendation.action}</strong>{" "}
          — {changeReport.recommendation.copy}
        </p>
      </section>

      <section className="brief__section">
        <h2>Changes ({changeReport.changes.length})</h2>
        {changeReport.changes.map((change) => (
          <ChangeBlock key={change.id} change={change} />
        ))}
      </section>

      <section className="brief__section">
        <h2>Routed actions</h2>
        {actionSummary.length === 0 ? (
          <p className="actions__empty" data-testid="actions-empty">
            No routed actions recorded for this brief.
          </p>
        ) : (
          <ul className="actions" data-testid="actions-list">
            {actionSummary.map((action, idx) => (
              <li key={idx}>
                <span>
                  <strong>{action.kind}</strong> → {action.target}
                </span>
                <span className="brief__meta">
                  {action.status} · {formatTimestamp(action.firedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="brief__footer">
        Brief id <code>{changeReport.id}</code> · Immutable · Public ·
        Generated by Unsyphn · Powered by ClickHouse + Senso
      </footer>
    </article>
  );
}

function ChangeBlock({ change }: { change: Change }): JSX.Element {
  const pctChange = change.dollarImpact?.pctChange;
  const citations = change.citations ?? [];

  return (
    <div className="change" data-testid={`change-${change.id}`}>
      <p className="change__category">{change.category} · {change.materiality}</p>
      <h3 className="change__summary">{change.summary}</h3>
      <div className="change__diff">
        <div className="change__before">
          <em>Before</em>
          {change.before}
        </div>
        <div className="change__after">
          <em>After</em>
          {change.after}
        </div>
      </div>
      {change.dollarImpact && (
        <p className="change__impact" data-testid={`impact-${change.id}`}>
          Impact: <strong>{formatDollar(change.dollarImpact.annualUsd)}/yr</strong>{" "}
          {pctChange === undefined ? null : (
            <>
              ({pctChange > 0 ? "+" : ""}
              {pctChange.toFixed(2)}%)
            </>
          )}
        </p>
      )}
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {citations.map((c, idx) => (
          <CitationView key={idx} citation={c} />
        ))}
      </ul>
    </div>
  );
}

function CitationView({ citation }: { citation: Citation }): JSX.Element {
  return (
    <li className="citation" data-testid="citation">
      <p className="citation__quote">"{citation.quote}"</p>
      <p className="citation__meta">
        {citation.section && <span>{citation.section} · </span>}
        {citation.url && (
          <a href={citation.url} rel="noreferrer" target="_blank">
            {citation.url}
          </a>
        )}
        {citation.url && citation.fetchedAt && " · "}
        {citation.fetchedAt && (
          <span>Fetched {formatTimestamp(citation.fetchedAt)}</span>
        )}
        {citation.country && <span> · {citation.country}</span>}
      </p>
    </li>
  );
}
