import { useState, useId } from "react";
import { Check, Minus, ChevronDown } from "lucide-react";
import { StripeModal } from "./StripeModal.js";

// §8.2 tier and add-on definitions
const TIERS = [
  { id: "discover", name: "Discover", price: "$0", period: "", description: "PLG funnel, pre-qualification",
    features: ["Single Google / M365 connection","Email-metadata + OAuth-grant discovery","Top-100 vendor cards with benchmark hints","5 contract uploads","Slack alerts","Audit log","\"Powered by Unsyphn\" footer on shared reports"],
    cta: "Start free", ctaVariant: "secondary" as const, recommended: false, ctaAction: "onboarding" as const },
  { id: "growth", name: "Growth", price: "$1,500", period: "/mo", description: "50–250 employees",
    features: ["Material Change Feed","Unlimited contracts","Renegotiation packets","Jira + Slack routing","3 integrations","Audit log","Remove branding"],
    cta: "Subscribe", ctaVariant: "secondary" as const, recommended: false, ctaAction: "stripe" as const },
  { id: "scale", name: "Scale", price: "$3,500", period: "/mo", description: "250–1,000 employees",
    features: ["Sub-processor heatmap","Customer Commitments extraction","Unlimited integrations","RBAC + SCIM","1 dedicated CSM hour/week","Custom SSO on all paid tiers","Priority support"],
    cta: "Subscribe — most popular", ctaVariant: "primary" as const, recommended: true, ctaAction: "stripe" as const },
  { id: "enterprise", name: "Enterprise", price: "$30K", period: "+ 15% of net savings", description: "1,000+ employees · savings capped at $200K/yr",
    features: ["Data residency (US / EU pinning)","Custom SSO + dedicated negotiation analyst","On-prem SIEM webhook","Audit-mode workspaces","Private API","99.9% SLA","Dedicated analyst"],
    cta: "Talk to us", ctaVariant: "secondary" as const, recommended: false, ctaAction: "enterprise" as const },
] as const;

const ADD_ONS = [
  { name: "Negotiation Concierge", price: "$10K/quarter", description: "Human procurement analyst handles 5 negotiations per quarter end-to-end.", mailto: "hello@unsyphn.com?subject=Negotiation%20Concierge%20add-on" },
  { name: "GRC Bridge", price: "$1,000/mo", description: "Deep two-way Vanta + Drata + OneTrust integration; auto-Trust-Center sync.", mailto: "hello@unsyphn.com?subject=GRC%20Bridge%20add-on" },
] as const;

const MATRIX_SECTIONS = [
  { label: "Discovery & Inventory", rows: [
    { feature: "Google / M365 OAuth discovery", tiers: [true, true, true, true] as const },
    { feature: "Unlimited vendor cards", tiers: [false, true, true, true] as const },
    { feature: "OAuth-grant risk scoring", tiers: [false, true, true, true] as const },
    { feature: "AI-predict from domain", tiers: [true, true, true, true] as const },
  ]},
  { label: "Renewal & Negotiation", rows: [
    { feature: "Renewal calendar + 30/60/90-day alerts", tiers: [false, true, true, true] as const },
    { feature: "One-click Renegotiation Packet", tiers: [false, true, true, true] as const },
    { feature: "Material Change Feed", tiers: [false, true, true, true] as const },
    { feature: "Dedicated negotiation analyst", tiers: [false, false, false, true] as const },
  ]},
  { label: "Risk, Compliance & Audit", rows: [
    { feature: "Audit log", tiers: [true, true, true, true] as const },
    { feature: "Sub-processor heatmap", tiers: [false, false, true, true] as const },
    { feature: "Customer Commitments extraction", tiers: [false, false, true, true] as const },
    { feature: "Data residency (US / EU)", tiers: [false, false, false, true] as const },
    { feature: "SCIM provisioning", tiers: [false, false, true, true] as const },
    { feature: "99.9% SLA", tiers: [false, false, false, true] as const },
  ]},
] as const;

const FAQ_ITEMS = [
  { q: "Why no per-seat pricing?",
    a: "Per-seat pricing penalizes growth — adding a new team member to your SaaS management layer shouldn't cost more money. Flat platform fees let your whole organization use Unsyphn without counting heads." },
  { q: "What counts as net savings (Enterprise variable component)?",
    a: "Net savings are verified reductions in SaaS spend: cancelled unused seats, renegotiated contracts below prior renewal price, and eliminated duplicate tools. We agree on a baseline at contract start and measure delta over 12 months. The 15% variable component is capped at $200K/yr regardless of savings achieved." },
  { q: "Where is my data stored?",
    a: "All plans use US-based infrastructure by default. Enterprise adds EU data residency (separate EU instance, no cross-region replication) for GDPR-sensitive workloads. We publish our sub-processor list on our Trust Center." },
  { q: "No-train AI guarantee?",
    a: "Unsyphn does not train models on customer data today. Should this change, we will provide customers with advance notice. Sensitive operations — clause extraction, Customer Commitments analysis — run on internally-hosted LLMs. Third-party API calls are made only under explicit DPA terms." },
] as const;

// ROI formula — §8.4 (calibrated: 500 employees → ~291 apps)
const AVG_APPS_PER_EMP = 0.582;
const WASTE_RATE = 0.51;
const AVG_SEAT_COST_MO = 22;
const GROWTH_PRICE_MO = 1500;

function calcRoi(n: number) {
  const annualWaste = n * AVG_APPS_PER_EMP * 12 * AVG_SEAT_COST_MO * WASTE_RATE;
  const recoverableQ1 = annualWaste * 0.25 * 0.6;
  const paybackWeeks = recoverableQ1 > 0 ? ((GROWTH_PRICE_MO * 12) / recoverableQ1) * 52 : 0;
  return { annualWaste, recoverableQ1, paybackWeeks };
}

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

// Shared style tokens used throughout
const S = {
  page: { background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-text)", minHeight: "100vh", paddingTop: 80 },
  section: { maxWidth: 960, margin: "0 auto", padding: "0 var(--space-5) var(--space-7)" },
  h2: { fontFamily: "var(--font-display)", color: "var(--text-strong)", marginBottom: "var(--space-4)" } as React.CSSProperties,
  cardPad: { padding: "var(--space-5)" },
  sm: { fontSize: "var(--text-sm)", color: "var(--text-2)" },
  xs: { fontSize: "var(--text-xs)", color: "var(--text-muted)" },
  mono500: { fontFamily: "var(--font-mono)", fontWeight: 500 } as React.CSSProperties,
} as const;

import React from "react";

export function Pricing(): JSX.Element {
  const [stripeOpen, setStripeOpen] = useState(false);
  const [employees, setEmployees] = useState(500);
  const sliderId = useId();
  const roi = calcRoi(employees);

  return (
    <div style={S.page}>
      {/* Hero */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "var(--space-9) var(--space-5) var(--space-7)", textAlign: "center" }}>
        <h1 className="h1" style={{ fontFamily: "var(--font-display)", color: "var(--text-strong)", marginBottom: "var(--space-3)" }}>
          Pricing
        </h1>
        <p className="lead" style={{ maxWidth: 520, margin: "0 auto", color: "var(--text-2)" }}>
          Companies on Growth average{" "}
          <strong style={{ color: "var(--text-strong)" }}>$135K recovered per quarter</strong>{" "}
          in their first year.
        </p>
      </section>

      {/* Tier cards */}
      <section aria-label="Pricing tiers" style={{ maxWidth: 1100, margin: "0 auto", padding: "0 var(--space-5) var(--space-7)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "var(--space-4)", alignItems: "stretch" }}>
        {TIERS.map((tier) => (
          <TierCard key={tier.id} tier={tier} onSubscribe={() => setStripeOpen(true)} />
        ))}
      </section>

      {/* Add-ons */}
      <section aria-label="Add-ons" style={S.section}>
        <h2 className="h2" style={S.h2}>Add-ons</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-4)" }}>
          {ADD_ONS.map((a) => (
            <div key={a.name} className="card" style={S.cardPad}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-2)" }}>
                <h3 style={{ fontFamily: "var(--font-text)", fontWeight: 600, fontSize: "var(--text-base)", margin: 0, color: "var(--text-strong)" }}>{a.name}</h3>
                <span style={{ ...S.mono500, fontSize: "var(--text-sm)", color: "var(--accent)", whiteSpace: "nowrap", marginLeft: "var(--space-3)" }}>{a.price}</span>
              </div>
              <p style={{ ...S.sm, margin: "0 0 var(--space-4)", lineHeight: 1.5 }}>{a.description}</p>
              <a href={`mailto:${a.mailto}`} className="btn btn-secondary" style={{ width: "100%", justifyContent: "center" }}>Enquire</a>
            </div>
          ))}
        </div>
      </section>

      {/* ROI Calculator */}
      <section aria-label="ROI calculator" style={S.section}>
        <div className="card" style={{ padding: "var(--space-6)" }}>
          <h2 className="h2" style={{ ...S.h2, marginBottom: "var(--space-5)" }}>ROI calculator</h2>
          <div style={{ marginBottom: "var(--space-5)" }}>
            <label htmlFor={sliderId} style={{ display: "flex", justifyContent: "space-between", ...S.sm, marginBottom: "var(--space-2)" }}>
              <span>Employee count</span>
              <span style={{ ...S.mono500, color: "var(--text-strong)" }}>{employees.toLocaleString("en-US")}</span>
            </label>
            <input id={sliderId} type="range" min={0} max={5000} step={50} value={employees}
              onChange={(e) => setEmployees(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)" }}
              aria-label="Number of employees" />
            <div style={{ display: "flex", justifyContent: "space-between", ...S.xs, marginTop: "var(--space-1)" }}>
              <span>0</span><span>5,000</span>
            </div>
          </div>
          <div aria-live="polite" aria-atomic="true" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-4)" }}>
            <RoiStat label="Avg SaaS apps" value={Math.round(employees * AVG_APPS_PER_EMP).toLocaleString("en-US")} />
            <RoiStat label="Annual waste" value={fmt(roi.annualWaste)} />
            <RoiStat label="Recoverable in Q1" value={fmt(roi.recoverableQ1)} />
            <RoiStat label="Payback on Growth tier" value={roi.paybackWeeks > 0 ? `${Math.round(roi.paybackWeeks)} weeks` : "—"} />
          </div>
        </div>
      </section>

      {/* Feature matrix */}
      <section aria-label="Feature comparison" style={S.section}>
        <h2 className="h2" style={S.h2}>Feature comparison</h2>
        <style>{`details[open] .details-chevron { transform: rotate(180deg); }`}</style>
        {MATRIX_SECTIONS.map((ms) => (
          <details key={ms.label} style={{ marginBottom: "var(--space-3)" }}>
            <summary style={{ listStyle: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-4) var(--space-5)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", cursor: "pointer", fontWeight: 600, ...S.sm, color: "var(--text-strong)", userSelect: "none" }}>
              {ms.label}
              <ChevronDown size={16} aria-hidden="true" style={{ color: "var(--text-muted)", transition: "transform var(--dur-fast)", flexShrink: 0 }} className="details-chevron" />
            </summary>
            <div style={{ border: "1px solid var(--border)", borderTop: "none", borderRadius: "0 0 var(--radius-md) var(--radius-md)", overflow: "hidden" }}>
              <MatrixHeaderRow />
              {ms.rows.map((row) => (
                <div key={row.feature} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "var(--space-2) var(--space-5)", borderBottom: "1px solid var(--border)", background: "var(--surface)", alignItems: "center" }}>
                  <span style={S.sm}>{row.feature}</span>
                  {row.tiers.map((included, i) => (
                    <span key={i} style={{ textAlign: "center" }} aria-label={included ? "Included" : "Not included"}>
                      {included
                        ? <Check size={14} aria-hidden="true" style={{ color: "var(--success)" }} />
                        : <Minus size={14} aria-hidden="true" style={{ color: "var(--text-disabled)" }} />}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </details>
        ))}
      </section>

      {/* FAQ */}
      <section aria-label="Frequently asked questions" style={{ ...S.section, padding: "0 var(--space-5) var(--space-9)" }}>
        <h2 className="h2" style={S.h2}>FAQ</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
              <summary style={{ listStyle: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-4) var(--space-5)", cursor: "pointer", fontWeight: 500, ...S.sm, color: "var(--text-strong)", userSelect: "none" }}>
                {item.q}
                <ChevronDown size={16} aria-hidden="true" style={{ color: "var(--text-muted)", flexShrink: 0 }} className="details-chevron" />
              </summary>
              <p style={{ padding: "0 var(--space-5) var(--space-4)", ...S.sm, lineHeight: 1.65, margin: 0 }}>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {stripeOpen && <StripeModal onClose={() => setStripeOpen(false)} />}
    </div>
  );
}

// Sub-components

interface TierCardProps {
  tier: (typeof TIERS)[number];
  onSubscribe: () => void;
}

function TierCard({ tier, onSubscribe }: TierCardProps): JSX.Element {
  function handleCta() {
    if (tier.ctaAction === "stripe") { onSubscribe(); return; }
    if (tier.ctaAction === "enterprise") { window.location.href = "mailto:enterprise@unsyphn.com"; return; }
    window.location.href = "/app/onboarding";
  }

  return (
    <div className="card" style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", position: "relative", outline: tier.recommended ? "2px solid var(--accent)" : undefined }}>
      {tier.recommended && (
        <span className="badge badge-accent" style={{ position: "absolute", top: "var(--space-4)", right: "var(--space-4)" }}>Recommended</span>
      )}
      <h3 style={{ fontFamily: "var(--font-text)", fontWeight: 600, fontSize: "var(--text-base)", color: "var(--text-strong)", margin: "0 0 var(--space-2)" }}>{tier.name}</h3>
      <div style={{ marginBottom: "var(--space-1)" }}>
        <span style={{ ...S.mono500, fontWeight: 700, fontSize: "var(--text-2xl)", color: "var(--text-strong)", letterSpacing: "-0.02em" }}>{tier.price}</span>
        {tier.period && <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginLeft: "var(--space-1)" }}>{tier.period}</span>}
      </div>
      <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: "0 0 var(--space-4)", lineHeight: 1.4 }}>{tier.description}</p>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 var(--space-5)", flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {tier.features.map((f) => (
          <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)", ...S.sm, lineHeight: 1.45 }}>
            <Check size={14} aria-hidden="true" style={{ color: "var(--success)", flexShrink: 0, marginTop: 2 }} />
            {f}
          </li>
        ))}
      </ul>
      <button type="button" onClick={handleCta} className={tier.ctaVariant === "primary" ? "btn btn-primary" : "btn btn-secondary"} style={{ width: "100%", justifyContent: "center" }}>
        {tier.cta}
      </button>
    </div>
  );
}

function MatrixHeaderRow(): JSX.Element {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", background: "var(--surface-2)", padding: "var(--space-2) var(--space-5)", borderBottom: "1px solid var(--border)" }}>
      {["Feature", ...TIERS.map((t) => t.name)].map((label, i) => (
        <span key={label} style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: i === 0 ? "left" : "center" } as React.CSSProperties}>
          {label}
        </span>
      ))}
    </div>
  );
}

interface RoiStatProps {
  label: string;
  value: string;
}

function RoiStat({ label, value }: RoiStatProps): JSX.Element {
  return (
    <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "var(--space-4)" }}>
      <div style={{ ...S.xs, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "var(--space-1)" }}>{label}</div>
      <div style={{ ...S.mono500, fontSize: "var(--text-xl)", color: "var(--text-strong)", letterSpacing: "-0.01em" }}>{value}</div>
    </div>
  );
}
