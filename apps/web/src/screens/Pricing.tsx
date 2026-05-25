import { useEffect, useMemo, useState } from "react";
import { StripeModal, type StripeTier } from "./StripeModal.js";
import { BillingToggle } from "./pricing/BillingToggle.js";
import { PricingTiers } from "./pricing/PricingTiers.js";
import { PricingAddOns, ADD_ONS, addOnMonthlyCents } from "./pricing/PricingAddOns.js";
import { PricingRoi } from "./pricing/PricingRoi.js";
import { PricingMatrix } from "./pricing/PricingMatrix.js";
import { PricingFaq } from "./pricing/PricingFaq.js";
import { InvoiceTable } from "./pricing/InvoiceTable.js";
import { effectiveCents, type BillingCadence, type TierDef } from "./pricing/tiers.js";

// Phase 8 orchestrator — defers all sections to sub-modules under ./pricing/.
// Owns: billing cadence (URL-persisted), add-on cart state, modal open/close.

const S = {
  page: {
    background: "var(--bg)",
    color: "var(--text)",
    fontFamily: "var(--font-text)",
    minHeight: "100vh",
    paddingTop: 80,
  } as React.CSSProperties,
  hero: {
    maxWidth: 1240,
    margin: "0 auto",
    padding: "var(--space-9) var(--space-5) var(--space-5)",
    textAlign: "center" as const,
  },
  toggleRow: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "var(--space-6)",
  },
  cartHint: {
    maxWidth: 1240,
    margin: "0 auto",
    padding: "0 var(--space-5) var(--space-4)",
    textAlign: "center" as const,
    fontSize: "var(--text-sm)",
    color: "var(--text-2)",
  },
} as const;

function readCadenceFromUrl(): BillingCadence {
  if (typeof window === "undefined") return "annual";
  const params = new URLSearchParams(window.location.search);
  return params.get("billing") === "monthly" ? "monthly" : "annual";
}

function writeCadenceToUrl(next: BillingCadence): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("billing", next);
  window.history.replaceState({}, "", url.toString());
}

function dollars(cents: number): string {
  return "$" + (cents / 100).toLocaleString("en-US");
}

export function Pricing(): JSX.Element {
  const [cadence, setCadence] = useState<BillingCadence>("annual");
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());
  const [activeTier, setActiveTier] = useState<TierDef | undefined>();

  // Initialize from URL once; intentionally not in deps so back/forward doesn't
  // fight user toggles.
  useEffect(() => {
    setCadence(readCadenceFromUrl());
  }, []);

  function handleCadenceChange(next: BillingCadence): void {
    setCadence(next);
    writeCadenceToUrl(next);
  }

  function toggleAddOn(id: string): void {
    setSelectedAddOns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const addOnTotalCents = addOnMonthlyCents(selectedAddOns);
  const addOnCount = selectedAddOns.size;

  function handleSubscribe(tier: TierDef): void {
    setActiveTier(tier);
  }

  const stripeTier: StripeTier | undefined = useMemo(() => {
    if (!activeTier?.sku) return undefined;
    const baseMonthly = effectiveCents(activeTier, cadence);
    // For annual cadence, charge the full annual amount up-front.
    const isAnnual = cadence === "annual";
    const cents = isAnnual ? baseMonthly * 12 : baseMonthly;
    const periodLabel = isAnnual ? "/yr" : "/mo";
    return {
      id: activeTier.sku,
      name: `${activeTier.name} · ${isAnnual ? "annual" : "monthly"}`,
      priceUsdCents: cents,
      period: periodLabel,
      features: activeTier.features,
      addOnIds: Array.from(selectedAddOns),
      addOnCents: isAnnual ? addOnTotalCents * 12 : addOnTotalCents,
      addOnPeriodLabel: periodLabel,
    };
  }, [activeTier, cadence, selectedAddOns, addOnTotalCents]);

  return (
    <div style={S.page}>
      {/* Hero */}
      <section style={S.hero}>
        <h1
          className="h1"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--text-strong)",
            marginBottom: "var(--space-3)",
          }}
        >
          Pricing
        </h1>
        <p
          className="lead"
          style={{ maxWidth: 520, margin: "0 auto", color: "var(--text-2)" }}
        >
          Companies on Growth average{" "}
          <strong style={{ color: "var(--text-strong)" }}>$135K recovered per quarter</strong>{" "}
          in their first year.
        </p>
      </section>

      {/* Billing cadence toggle */}
      <div style={S.toggleRow}>
        <BillingToggle value={cadence} onChange={handleCadenceChange} />
      </div>

      {/* Tier cards */}
      <PricingTiers cadence={cadence} onSubscribe={handleSubscribe} />

      {/* Add-on cart hint */}
      {addOnCount > 0 && (
        <p style={S.cartHint} aria-live="polite">
          + <strong style={{ color: "var(--text-strong)" }}>{dollars(addOnTotalCents)}/mo</strong>{" "}
          for {addOnCount} add-on{addOnCount === 1 ? "" : "s"} ({
            ADD_ONS.filter((a) => selectedAddOns.has(a.id))
              .map((a) => a.name)
              .join(", ")
          })
        </p>
      )}

      {/* Add-ons */}
      <PricingAddOns selected={selectedAddOns} onToggle={toggleAddOn} />

      {/* ROI Calculator */}
      <PricingRoi />

      {/* Feature matrix */}
      <PricingMatrix />

      {/* Invoice history */}
      <InvoiceTable />

      {/* FAQ */}
      <PricingFaq />

      {activeTier && (
        <StripeModal
          onClose={() => setActiveTier(undefined)}
          tier={stripeTier}
        />
      )}
    </div>
  );
}
