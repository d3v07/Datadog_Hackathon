import { useRef } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { PaymentIntentResponse } from "../../lib/api.js";

function dollars(cents: number): string {
  return "$" + (cents / 100).toLocaleString("en-US");
}

interface PaymentFormProps {
  intent: PaymentIntentResponse;
  onProcessing: () => void;
  onError: (message: string) => void;
  onTierSuccess?: () => void;
  disabled: boolean;
}

export function PaymentForm({ intent, onProcessing, onError, onTierSuccess, disabled }: PaymentFormProps): JSX.Element {
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
        className="button-pop"
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
