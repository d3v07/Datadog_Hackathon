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
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stripe-modal-title"
      onClick={onBackdropClick}
    >
      <div className="modal">
        <header className="modal__header">
          <h2 id="stripe-modal-title" className="modal__title">
            {product?.name ?? "Compliance Pack"}
          </h2>
          <button className="modal__close" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {status === "loading-product" && <p className="muted">Loading product…</p>}

        {alreadyEntitled && (
          <div className="alert alert--ok" role="status">
            This org already has the Compliance Pack.
          </div>
        )}

        {product && status === "ready-to-pay" && !alreadyEntitled && (
          <>
            <p className="modal__price">
              ${(product.priceUsdCents / 100).toLocaleString()}{" "}
              <span className="muted">one-time</span>
            </p>
            <ul className="features">
              {product.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button className="btn" type="button" onClick={beginPayment} data-testid="begin-payment">
              Upgrade · ${(product.priceUsdCents / 100).toLocaleString()}
            </button>
          </>
        )}

        {status === "creating-intent" && (
          <p className="muted">Creating payment intent…</p>
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

        {status === "success" && (
          <div className="alert alert--ok" role="status">
            <strong>Compliance Pack unlocked.</strong> Evidence bundles, auditor
            portal, and Vanta/Drata push are now available.
          </div>
        )}

        {status === "failure" && (
          <>
            <div className="alert alert--err" role="alert">
              {errorMessage ?? "Payment failed"}
            </div>
            <button className="btn" type="button" onClick={beginPayment} data-testid="retry">
              Retry
            </button>
          </>
        )}

        <p className="muted modal__hint">
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
    // On success, we don't flip UI here — we wait for the SSE org.entitlements.changed
    // event from the webhook to confirm server-side state.
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
        className="btn"
        disabled={!stripe || disabled}
        data-testid="confirm-payment"
        style={{ marginTop: 16 }}
      >
        {disabled ? "Processing…" : "Pay"}
      </button>
    </form>
  );
}
