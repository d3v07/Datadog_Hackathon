import { useEffect, useRef, useState } from "react";
import type { EvidenceBriefResponse, Resolution } from "@redline/shared";
import { getEvidence, DEMO_BEARER_TOKEN, ApiError } from "../lib/api.js";
import { SeverityBadge } from "../components/SeverityBadge.js";
import { Drawer } from "../components/Drawer.js";

interface Props {
  changeId: string;
}

interface Toast {
  msg: string;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - Date.parse(iso);
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

function formatImpact(annualUsd: number): string {
  if (annualUsd >= 1000) return `$${Math.round(annualUsd / 1000)}k`;
  return `$${annualUsd}`;
}

function useToast(): [Toast | null, (msg: string) => void] {
  const [toast, setToast] = useState<Toast | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = (msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ msg });
    timerRef.current = setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return [toast, show];
}

async function lifecyclePost(
  id: string,
  action: "acknowledge" | "snooze" | "resolve",
  body: Record<string, unknown>,
): Promise<void> {
  const resp = await fetch(`/v1/changes/${encodeURIComponent(id)}/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEMO_BEARER_TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    let msg = `Request failed (${resp.status})`;
    try {
      const j = JSON.parse(text) as { error?: { message?: string } };
      if (j.error?.message) msg = j.error.message;
    } catch { /* ignore parse error */ }
    throw new Error(msg);
  }
}

export function ChangeReport({ changeId }: Props): JSX.Element {
  const [brief, setBrief] = useState<EvidenceBriefResponse | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bundleLink, setBundleLink] = useState<string | null>(null);
  const [toast, showToast] = useToast();
  const escalateBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadErr(null);
    setBrief(null);
    getEvidence(changeId)
      .then((data) => { if (!cancelled) setBrief(data); })
      .catch((err) => {
        if (!cancelled) {
          setLoadErr(err instanceof ApiError ? err.message : "Failed to load change report");
        }
      });
    return () => { cancelled = true; };
  }, [changeId]);

  if (loadErr) {
    return (
      <div style={{ padding: "var(--space-7)", color: "var(--danger)" }}>
        {loadErr}
      </div>
    );
  }

  if (!brief) {
    return (
      <div
        style={{ padding: "var(--space-7)", color: "var(--muted)" }}
        aria-live="polite"
        aria-label="Loading change report"
      >
        Loading…
      </div>
    );
  }

  const { changeReport: report, vendor, policyFired, policyAlsoMatched } = brief;
  const isDone = report.state === "resolved";
  const isAcked = report.state === "acknowledged";

  const handle = async (
    action: "acknowledge" | "snooze" | "resolve",
    body: Record<string, unknown>,
    successMsg: string,
  ) => {
    if (busy) return;
    setBusy(true);
    try {
      await lifecyclePost(changeId, action, body);
      showToast(successMsg);
      const updated = await getEvidence(changeId);
      setBrief(updated);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const onAcknowledge = () => handle("acknowledge", {}, "Acknowledged.");
  const onSnooze = () =>
    handle(
      "snooze",
      { untilAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString() },
      "Snoozed 48h.",
    );
  const onResolve = () =>
    handle("resolve", { resolution: "accepted" as Resolution }, "Resolved.");

  const onEscalateConfirm = () => {
    setBundleLink(`/app/evidence/${changeId}`);
    showToast("Routed to Legal. Bundle generated.");
    setDrawerOpen(false);
  };

  return (
    <div
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "var(--space-6) var(--space-5) var(--space-9)",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "var(--space-5)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            flexWrap: "wrap",
            marginBottom: "var(--space-2)",
          }}
        >
          <SeverityBadge severity={report.severity} />
          <h1
            className="h1"
            style={{ fontSize: "var(--text-2xl)", fontWeight: 200 }}
          >
            {report.headline ?? report.changes[0]?.summary ?? "Change Report"}
          </h1>
        </div>
        <p style={{ color: "var(--muted)", fontSize: "var(--text-sm)", margin: 0 }}>
          {vendor.name} · detected {relativeTime(report.detectedAt)} · owner{" "}
          {report.ownerId} · status: {report.state}
        </p>
      </div>

      <hr className="hairline" style={{ marginBottom: "var(--space-6)" }} />

      {/* Recommendation */}
      <section aria-labelledby="rec-heading" style={{ marginBottom: "var(--space-6)" }}>
        <h2 className="h2" id="rec-heading" style={{ marginBottom: "var(--space-3)" }}>
          Recommendation
        </h2>
        <p style={{ color: "var(--text-2)", lineHeight: 1.65, margin: 0 }}>
          {report.recommendation.copy}
        </p>
      </section>

      {/* Diff */}
      <section aria-labelledby="diff-heading" style={{ marginBottom: "var(--space-6)" }}>
        <h2 className="h2" id="diff-heading" style={{ marginBottom: "var(--space-3)" }}>
          Diff
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {report.changes.map((change, i) => (
            <div
              key={change.id ?? i}
              className="card"
              style={{ padding: "var(--space-4) var(--space-5)" }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "var(--space-2)",
                  alignItems: "center",
                  marginBottom: "var(--space-3)",
                  flexWrap: "wrap",
                }}
              >
                <span
                  className="badge badge-neutral"
                  style={{ textTransform: "capitalize" }}
                >
                  {change.category ?? "change"}
                </span>
                {change.materiality && (
                  <span className="badge badge-neutral">
                    {change.materiality} materiality
                  </span>
                )}
                {change.dollarImpact && (
                  <span
                    className="badge badge-danger"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {formatImpact(change.dollarImpact.annualUsd)} impact
                  </span>
                )}
              </div>
              {change.before && (
                <div style={{ marginBottom: "var(--space-2)" }}>
                  <span
                    style={{
                      color: "var(--muted)",
                      fontSize: "var(--text-xs)",
                      fontWeight: 500,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    Before
                  </span>
                  <p
                    style={{
                      color: "var(--text-2)",
                      fontSize: "var(--text-sm)",
                      margin: "var(--space-1) 0 0",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {change.before}
                  </p>
                </div>
              )}
              {change.after && (
                <div style={{ marginBottom: "var(--space-2)" }}>
                  <span
                    style={{
                      color: "var(--muted)",
                      fontSize: "var(--text-xs)",
                      fontWeight: 500,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    After
                  </span>
                  <p
                    style={{
                      color: "var(--text)",
                      fontSize: "var(--text-sm)",
                      margin: "var(--space-1) 0 0",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {change.after}
                  </p>
                </div>
              )}
              {change.citations && change.citations.length > 0 && (
                <div
                  style={{
                    marginTop: "var(--space-3)",
                    paddingTop: "var(--space-3)",
                    borderTop: "1px solid var(--hairline)",
                  }}
                >
                  {change.citations.map((cit, ci) => (
                    <p
                      key={ci}
                      style={{
                        color: "var(--muted)",
                        fontSize: "var(--text-xs)",
                        margin: ci > 0 ? "var(--space-1) 0 0" : 0,
                      }}
                    >
                      Citation:{" "}
                      {cit.url ? (
                        <a
                          href={cit.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Citation source (opens in new tab): ${cit.url}`}
                          style={{ color: "var(--accent)" }}
                        >
                          {cit.url}
                        </a>
                      ) : (
                        cit.section ?? "—"
                      )}
                      {cit.fetchedAt && ` · fetched ${cit.fetchedAt.slice(0, 10)}`}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Policy */}
      <section aria-labelledby="policy-heading" style={{ marginBottom: "var(--space-6)" }}>
        <h2 className="h2" id="policy-heading" style={{ marginBottom: "var(--space-3)" }}>
          Policy fired
        </h2>
        <p style={{ color: "var(--text-2)", fontSize: "var(--text-sm)", margin: 0 }}>
          {policyFired.name} ·{" "}
          <span
            style={{
              color: "var(--muted)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
            }}
          >
            {policyFired.id}
          </span>
        </p>

        {policyAlsoMatched.length > 0 && (
          <div style={{ marginTop: "var(--space-4)" }}>
            <p
              style={{
                color: "var(--muted)",
                fontSize: "var(--text-xs)",
                fontWeight: 500,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                marginBottom: "var(--space-2)",
              }}
            >
              Also matched
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {policyAlsoMatched.map((p) => (
                <li
                  key={p.id}
                  style={{
                    color: "var(--text-2)",
                    fontSize: "var(--text-sm)",
                    padding: "var(--space-1) 0",
                  }}
                >
                  · {p.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <hr className="hairline" style={{ marginBottom: "var(--space-5)" }} />

      {/* Action row */}
      <div
        role="group"
        aria-label="Change lifecycle actions"
        style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}
      >
        {!isAcked && !isDone && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onAcknowledge}
            disabled={busy}
          >
            Acknowledge
          </button>
        )}
        {!isDone && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onSnooze}
            disabled={busy}
          >
            Snooze 48h
          </button>
        )}
        {!isDone && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onResolve}
            disabled={busy}
          >
            Resolve
          </button>
        )}
        <button
          ref={escalateBtnRef}
          type="button"
          className="btn btn-ghost"
          onClick={() => setDrawerOpen(true)}
          style={{ color: "var(--warning)" }}
        >
          Escalate to Legal
        </button>
      </div>

      {bundleLink && (
        <p style={{ marginTop: "var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-2)" }}>
          Bundle generated →{" "}
          <a href={bundleLink} style={{ color: "var(--accent)" }}>
            /evidence/{changeId}
          </a>
        </p>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: "var(--space-6)",
            right: "var(--space-6)",
            background: "var(--surface-2)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-3) var(--space-4)",
            fontSize: "var(--text-sm)",
            color: "var(--text)",
            zIndex: 300,
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Escalate Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Escalate to Legal"
      >
        <p style={{ color: "var(--text-2)", fontSize: "var(--text-sm)", marginTop: 0 }}>
          Route this to the Legal team? Adds a Slack DM + Jira ticket.
        </p>
        <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-5)" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setDrawerOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onEscalateConfirm}
          >
            Confirm &amp; Generate Evidence Bundle
          </button>
        </div>
      </Drawer>
    </div>
  );
}
