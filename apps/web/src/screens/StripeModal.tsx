import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { loadStripe, type Stripe, type StripeElementsOptions } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  ApiError,
  createPaymentIntent,
  getBillingProducts,
  simulateSuccess,
  validateCoupon,
  type AppliedCoupon,
  type BillingProduct,
  type PaymentIntentRequest,
  type PaymentIntentResponse,
} from "../lib/api.js";
import { useEntitlements } from "../lib/stream.js";

// Issue #3 + Phase 8 · Stripe modal. Supports both the legacy one-time
// Compliance Pack flow (entitlement-bearing, success via SSE) and the new
// tier subscription flow (success goes straight to /app/settings?tab=billing).
// States: idle → loading → ready (Elements mounted) → processing → success
// (driven either by SSE or by stripe.confirmPayment OK) → failure (with retry).
// Hidden Shift+Enter handler runs the Runbook F5 fallback in dev.

type ModalStatus =
  | "loading-product"
  | "ready-to-pay"
  | "creating-intent"
  | "elements-ready"
  | "processing"
  | "success"
  | "failure";

export interface StripeTier {
  id: string;
  name: string;
  priceUsdCents: number;
  /** Optional formatted period like "/mo", "/yr". */
  period?: string;
  features: ReadonlyArray<string>;
  /** Optional add-on ids selected at the Pricing screen. */
  addOnIds?: ReadonlyArray<string>;
  /** Optional add-on cost in cents (matches `period`). */
  addOnCents?: number;
  /** Label shown next to the add-on line — should match `period`. */
  addOnPeriodLabel?: string;
}

interface StripeModalProps {
  onClose: () => void;
  /** When provided, the modal skips loading the legacy Compliance Pack product
   *  and uses this tier directly. */
  tier?: StripeTier;
}

const S = {
  backdrop: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(2px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "var(--space-5)",
  },
  modal: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "var(--space-6)",
    maxWidth: 460,
    width: "100%",
    position: "relative" as const,
    boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
    maxHeight: "92vh",
    overflowY: "auto" as const,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "var(--space-5)",
    gap: "var(--space-3)",
  },
  title: {
    fontFamily: "var(--font-display)",
    fontSize: "var(--text-xl)",
    fontWeight: 200,
    letterSpacing: "-0.02em",
    color: "var(--text-strong)",
    margin: 0,
  },
  closeBtn: {
    background: "none",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    color: "var(--text-2)",
    cursor: "pointer",
    fontSize: "18px",
    lineHeight: 1,
    padding: "2px 8px 4px",
    flexShrink: 0,
  },
  price: {
    fontSize: "var(--text-2xl)",
    fontWeight: 200,
    color: "var(--text-strong)",
    margin: "0 0 var(--space-4)",
    letterSpacing: "-0.02em",
    display: "flex",
    alignItems: "baseline",
    gap: "var(--space-2)",
  },
  priceStrike: {
    fontSize: "var(--text-base)",
    color: "var(--text-muted)",
    textDecoration: "line-through",
    fontWeight: 300,
  },
  priceDiscounted: { color: "var(--success)" },
  priceUnit: {
    fontSize: "var(--text-base)",
    color: "var(--muted)",
    fontWeight: 300,
  },
  features: {
    listStyle: "none",
    padding: 0,
    margin: "0 0 var(--space-5)",
    display: "flex",
    flexDirection: "column" as const,
    gap: "var(--space-2)",
  },
  featureItem: {
    fontSize: "var(--text-sm)",
    color: "var(--text-2)",
    paddingLeft: "var(--space-4)",
    position: "relative" as const,
  },
  featureDot: {
    position: "absolute" as const,
    left: 0,
    color: "var(--success)",
    fontWeight: 700,
  },
  couponRow: {
    display: "flex",
    gap: "var(--space-2)",
    marginBottom: "var(--space-4)",
  },
  couponLabel: {
    display: "block" as const,
    fontSize: "var(--text-xs)",
    color: "var(--text-2)",
    marginBottom: "var(--space-2)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  couponInput: {
    flex: 1,
    height: 36,
    padding: "0 var(--space-3)",
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-strong)",
    fontFamily: "var(--font-mono)",
    fontSize: "var(--text-sm)",
    textTransform: "uppercase" as const,
  },
  couponBtn: {
    height: 36,
    padding: "0 var(--space-4)",
    background: "var(--surface-2)",
    color: "var(--text-strong)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    fontSize: "var(--text-sm)",
    cursor: "pointer",
  },
  couponOk: {
    fontSize: "var(--text-xs)",
    color: "var(--success)",
    marginTop: "var(--space-2)",
  },
  couponErr: {
    fontSize: "var(--text-xs)",
    color: "var(--danger)",
    marginTop: "var(--space-2)",
  },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 40,
    padding: "0 var(--space-4)",
    background: "var(--accent)",
    color: "var(--bg)",
    border: "1px solid var(--accent)",
    borderRadius: "var(--radius-md)",
    fontFamily: "var(--font-text)",
    fontSize: "var(--text-sm)",
    fontWeight: 400,
    cursor: "pointer",
    transition: "background 100ms",
  },
  toast: {
    position: "fixed" as const,
    bottom: 24,
    left: "50%",
    transform: "translateX(-50%)",
    background: "var(--surface)",
    border: "1px solid var(--success)",
    color: "var(--text-strong)",
    padding: "var(--space-3) var(--space-5)",
    borderRadius: "var(--radius-md)",
    fontSize: "var(--text-sm)",
    zIndex: 1100,
    boxShadow: "0 8px 20px rgba(0,0,0,0.4)",
  },
  muted: {
    fontSize: "var(--text-xs)",
    color: "var(--muted)",
    margin: "var(--space-3) 0 0",
    textAlign: "center" as const,
  },
  alertOk: {
    background: "rgba(63,207,142,0.10)",
    border: "1px solid rgba(63,207,142,0.25)",
    borderRadius: "var(--radius-md)",
    padding: "var(--space-4)",
    color: "var(--success)",
    fontSize: "var(--text-sm)",
    marginBottom: "var(--space-4)",
  },
  alertErr: {
    background: "rgba(244,113,116,0.10)",
    border: "1px solid rgba(244,113,116,0.25)",
    borderRadius: "var(--radius-md)",
    padding: "var(--space-4)",
    color: "var(--danger)",
    fontSize: "var(--text-sm)",
    marginBottom: "var(--space-4)",
  },
} as const;

function dollars(cents: number): string {
  return "$" + (cents / 100).toLocaleString("en-US");
}

export function StripeModal({ onClose, tier }: StripeModalProps): JSX.Element {
  const isTierFlow = Boolean(tier);
  const [status, setStatus] = useState<ModalStatus>(
    isTierFlow ? "ready-to-pay" : "loading-product",
  );
  const [product, setProduct] = useState<BillingProduct | undefined>();
  const [intent, setIntent] = useState<PaymentIntentResponse | undefined>();
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [alreadyEntitled, setAlreadyEntitled] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | undefined>();
  const [couponError, setCouponError] = useState<string | undefined>();
  const [showToast, setShowToast] = useState(false);

  // Only the legacy Compliance Pack flow waits for the SSE flip.
  const entitlements = useEntitlements({
    active: !isTierFlow && status !== "loading-product" && status !== "success",
  });

  useEffect(() => {
    if (!isTierFlow && entitlements?.compliancePack) {
      setStatus("success");
    }
  }, [entitlements, isTierFlow]);

  // Legacy product loader — skipped for tier flows.
  useEffect(() => {
    if (isTierFlow) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await getBillingProducts();
        if (cancelled) return;
        const first = resp.data[0];
        if (!first) {
          setErrorMessage("No products available");
          setStatus("failure");
          return;
        }
        setProduct(first);
        if (resp.orgEntitlements.compliancePack) {
          setAlreadyEntitled(true);
          setStatus("success");
        } else {
          setStatus("ready-to-pay");
        }
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(err instanceof Error ? err.message : "load failed");
        setStatus("failure");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isTierFlow]);

  const displayName = tier?.name ?? product?.name ?? "Compliance Pack";
  const displayCents = tier?.priceUsdCents ?? product?.priceUsdCents ?? 0;
  const displayPeriod = tier?.period ?? "one-time";
  const features = (tier?.features ?? product?.features ?? []) as ReadonlyArray<string>;
  const discountedCents = appliedCoupon
    ? Math.max(0, Math.round(displayCents * (1 - appliedCoupon.percentOff / 100)))
    : displayCents;
  const addOnCents = tier?.addOnCents ?? 0;
  const totalCents = discountedCents + addOnCents;

  async function applyCouponClick(): Promise<void> {
    setCouponError(undefined);
    setAppliedCoupon(undefined);
    const code = coupon.trim();
    if (!code) return;
    try {
      const result = await validateCoupon(code);
      setAppliedCoupon(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setCouponError("Invalid coupon");
        return;
      }
      setCouponError(err instanceof Error ? err.message : "Failed to validate");
    }
  }

  const beginPayment = useCallback(async () => {
    const sku = tier?.id ?? product?.id;
    if (!sku) return;
    setStatus("creating-intent");
    setErrorMessage(undefined);
    try {
      const payload: PaymentIntentRequest = {
        sku,
        coupon: appliedCoupon?.code,
        addOns: tier?.addOnIds ? [...tier.addOnIds] : undefined,
      };
      const created = await createPaymentIntent(payload);
      setIntent(created);
      setStripePromise(loadStripe(created.publishableKey));
      setStatus("elements-ready");
    } catch (err) {
      if (err instanceof ApiError && err.code === "conflict") {
        setAlreadyEntitled(true);
        setStatus("success");
        return;
      }
      setErrorMessage(err instanceof Error ? err.message : "failed to start checkout");
      setStatus("failure");
    }
  }, [appliedCoupon, product, tier]);

  const finishTierSuccess = useCallback(() => {
    setStatus("success");
    setShowToast(true);
    // Brief delay so the toast is visible before redirect.
    window.setTimeout(() => {
      window.location.href = "/app/settings?tab=billing";
    }, 1200);
  }, []);

  const runFallback = useCallback(async () => {
    setStatus("processing");
    setErrorMessage(undefined);
    try {
      await simulateSuccess();
      if (isTierFlow) {
        finishTierSuccess();
      }
      // For the legacy Compliance Pack flow, the SSE handler flips to success.
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "fallback failed");
      setStatus("failure");
    }
  }, [finishTierSuccess, isTierFlow]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        void runFallback();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [runFallback, onClose]);

  const onBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  return (
    <div
      style={S.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="stripe-modal-title"
      onClick={onBackdropClick}
    >
      <div style={S.modal}>
        <header style={S.header}>
          <h2 id="stripe-modal-title" style={S.title}>
            {displayName}
          </h2>
          <button style={S.closeBtn} type="button" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {status === "loading-product" && !isTierFlow && (
          <p style={S.muted}>Loading product…</p>
        )}

        {alreadyEntitled && (
          <div style={S.alertOk} role="status">
            This org already has the Compliance Pack.
          </div>
        )}

        {!alreadyEntitled && status === "ready-to-pay" && (
          <>
            <p style={S.price}>
              {appliedCoupon ? (
                <>
                  <span style={S.priceStrike}>{dollars(displayCents)}</span>
                  <span style={S.priceDiscounted}>{dollars(discountedCents)}</span>
                </>
              ) : (
                <span>{dollars(displayCents)}</span>
              )}
              <span style={S.priceUnit}>{displayPeriod}</span>
            </p>
            {addOnCents > 0 && (
              <p style={{ ...S.muted, textAlign: "left", margin: "0 0 var(--space-4)" }}>
                + {dollars(addOnCents)}{tier?.addOnPeriodLabel ?? "/mo"} for {tier?.addOnIds?.length ?? 0} add-on
                {(tier?.addOnIds?.length ?? 0) === 1 ? "" : "s"}
              </p>
            )}
            <ul style={S.features}>
              {features.map((f) => (
                <li key={f} style={S.featureItem}>
                  <span style={S.featureDot} aria-hidden="true">·</span>
                  {f}
                </li>
              ))}
            </ul>

            <div>
              <label style={S.couponLabel} htmlFor="coupon-input">Coupon code</label>
              <div style={S.couponRow}>
                <input
                  id="coupon-input"
                  type="text"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  placeholder="HACKATHON25"
                  style={S.couponInput}
                  aria-describedby="coupon-feedback"
                />
                <button
                  type="button"
                  onClick={() => void applyCouponClick()}
                  style={S.couponBtn}
                  data-testid="apply-coupon"
                >
                  Apply
                </button>
              </div>
              {appliedCoupon && (
                <p id="coupon-feedback" style={S.couponOk} role="status">
                  {appliedCoupon.code} applied — {appliedCoupon.label}
                </p>
              )}
              {couponError && (
                <p id="coupon-feedback" style={S.couponErr} role="alert">
                  {couponError}
                </p>
              )}
            </div>

            <button
              style={{ ...S.btnPrimary, marginTop: "var(--space-4)" }}
              type="button"
              onClick={() => void beginPayment()}
              data-testid="begin-payment"
            >
              {isTierFlow ? `Pay ${dollars(totalCents)}` : `Upgrade · ${dollars(totalCents)}`}
            </button>
          </>
        )}

        {status === "creating-intent" && (
          <p style={S.muted}>Creating payment intent…</p>
        )}

        {(status === "elements-ready" || status === "processing") && intent && stripePromise && (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret: intent.clientSecret } satisfies StripeElementsOptions}
          >
            <PaymentForm
              intent={intent}
              onProcessing={() => setStatus("processing")}
              onError={(msg) => {
                setErrorMessage(msg);
                setStatus("failure");
              }}
              onTierSuccess={isTierFlow ? finishTierSuccess : undefined}
              disabled={status === "processing"}
            />
          </Elements>
        )}

        {status === "success" && !alreadyEntitled && (
          <div style={S.alertOk} role="status">
            {isTierFlow ? (
              <>
                <strong>Subscription active.</strong> Entitlements updated — redirecting…
              </>
            ) : (
              <>
                <strong>Compliance Pack unlocked.</strong> Evidence bundles, auditor
                portal, and Vanta/Drata push are now available.
              </>
            )}
          </div>
        )}

        {status === "failure" && (
          <>
            <div style={S.alertErr} role="alert">
              {errorMessage ?? "Payment failed"}
            </div>
            <button
              style={S.btnPrimary}
              type="button"
              onClick={() => void beginPayment()}
              data-testid="retry"
            >
              Retry
            </button>
          </>
        )}

        <p style={S.muted}>
          On-stage fallback: press <kbd>Shift</kbd> + <kbd>Enter</kbd> to simulate success.
        </p>
      </div>
      {showToast && (
        <div style={S.toast} role="status" aria-live="polite">
          Subscription active — entitlements updated
        </div>
      )}
    </div>
  );
}

interface PaymentFormProps {
  intent: PaymentIntentResponse;
  onProcessing: () => void;
  onError: (message: string) => void;
  onTierSuccess?: () => void;
  disabled: boolean;
}

function PaymentForm({ intent, onProcessing, onError, onTierSuccess, disabled }: PaymentFormProps): JSX.Element {
  const stripe = useStripe();
  const elements = useElements();
  const submitting = useRef(false);

  async function submit(): Promise<void> {
    if (!stripe || !elements || submitting.current) return;
    submitting.current = true;
    onProcessing();
    const { error } = await stripe.confirmPayment({
      elements,
      clientSecret: intent.clientSecret,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });
    submitting.current = false;
    if (error) {
      onError(error.message ?? "Payment failed");
      return;
    }
    // Tier subscriptions don't fire an SSE entitlement flip — resolve here.
    onTierSuccess?.();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <PaymentElement />
      <button
        type="submit"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: 40,
          padding: "0 var(--space-4)",
          background: "var(--accent)",
          color: "var(--bg)",
          border: "1px solid var(--accent)",
          borderRadius: "var(--radius-md)",
          fontFamily: "var(--font-text)",
          fontSize: "var(--text-sm)",
          fontWeight: 400,
          cursor: !stripe || disabled ? "not-allowed" : "pointer",
          opacity: !stripe || disabled ? 0.45 : 1,
          marginTop: 16,
        }}
        disabled={!stripe || disabled}
        data-testid="confirm-payment"
      >
        {disabled ? "Processing…" : `Pay ${dollars(intent.amountUsdCents)}`}
      </button>
    </form>
  );
}
