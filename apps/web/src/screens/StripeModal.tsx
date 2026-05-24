import { useCallback, useEffect, useRef, useState } from "react";
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
  type BillingProduct,
  type PaymentIntentResponse,
} from "../lib/api.js";
import { useEntitlements } from "../lib/stream.js";

// Issue #3 · Stripe modal. States: idle → loading → ready (Elements mounted)
// → processing → success (driven by SSE org.entitlements.changed) → failure
// (with retry). Hidden Shift+Enter handler runs the Runbook F5 fallback.

type ModalStatus =
  | "loading-product"
  | "ready-to-pay"
  | "creating-intent"
  | "elements-ready"
  | "processing"
  | "success"
  | "failure";

interface StripeModalProps {
  onClose: () => void;
}

// Inline styles using CSS tokens — modal CSS was removed with old styles.css.
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
    maxWidth: 440,
    width: "100%",
    position: "relative" as const,
    boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
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
  },
  priceUnit: {
    fontSize: "var(--text-base)",
    color: "var(--muted)",
    fontWeight: 300,
    marginLeft: "var(--space-2)",
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

export function StripeModal({ onClose }: StripeModalProps): JSX.Element {
  const [status, setStatus] = useState<ModalStatus>("loading-product");
  const [product, setProduct] = useState<BillingProduct | undefined>();
  const [intent, setIntent] = useState<PaymentIntentResponse | undefined>();
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [alreadyEntitled, setAlreadyEntitled] = useState(false);

  // Listen for the entitlement flip. Active once we've started the payment flow.
  const entitlements = useEntitlements({
    active: status !== "loading-product" && status !== "success",
  });

  useEffect(() => {
    if (entitlements?.compliancePack) {
      setStatus("success");
    }
  }, [entitlements]);

  useEffect(() => {
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
  }, []);

  const beginPayment = useCallback(async () => {
    if (!product) return;
    setStatus("creating-intent");
    setErrorMessage(undefined);
    try {
      const created = await createPaymentIntent(product.id);
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
  }, [product]);

  const runFallback = useCallback(async () => {
    setStatus("processing");
    setErrorMessage(undefined);
    try {
      await simulateSuccess();
      // SSE handler will flip status to success.
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "fallback failed");
      setStatus("failure");
    }
  }, []);

  // ESC and Shift+Enter work in ALL states including already-entitled / success.
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

  // Backdrop click always closes.
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
            {product?.name ?? "Compliance Pack"}
          </h2>
          {/* UX-1 fix: × calls onClose in all states including already-entitled */}
          <button style={S.closeBtn} type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {status === "loading-product" && (
          <p style={S.muted}>Loading product…</p>
        )}

        {alreadyEntitled && (
          <div style={S.alertOk} role="status">
            This org already has the Compliance Pack.
          </div>
        )}

        {product && status === "ready-to-pay" && !alreadyEntitled && (
          <>
            <p style={S.price}>
              ${(product.priceUsdCents / 100).toLocaleString()}
              <span style={S.priceUnit}>one-time</span>
            </p>
            <ul style={S.features}>
              {product.features.map((f) => (
                <li key={f} style={S.featureItem}>
                  <span style={S.featureDot} aria-hidden="true">·</span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              style={S.btnPrimary}
              type="button"
              onClick={() => void beginPayment()}
              data-testid="begin-payment"
            >
              Upgrade · ${(product.priceUsdCents / 100).toLocaleString()}
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
              disabled={status === "processing"}
            />
          </Elements>
        )}

        {status === "success" && !alreadyEntitled && (
          <div style={S.alertOk} role="status">
            <strong>Compliance Pack unlocked.</strong> Evidence bundles, auditor
            portal, and Vanta/Drata push are now available.
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
    </div>
  );
}

interface PaymentFormProps {
  intent: PaymentIntentResponse;
  onProcessing: () => void;
  onError: (message: string) => void;
  disabled: boolean;
}

function PaymentForm({ intent, onProcessing, onError, disabled }: PaymentFormProps): JSX.Element {
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
    }
    // On success, wait for SSE org.entitlements.changed to confirm server-side state.
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
        style={{ ...S.btnPrimary, marginTop: 16, opacity: !stripe || disabled ? 0.45 : 1, cursor: !stripe || disabled ? "not-allowed" : "pointer" }}
        disabled={!stripe || disabled}
        data-testid="confirm-payment"
      >
        {disabled ? "Processing…" : "Pay"}
      </button>
    </form>
  );
}
