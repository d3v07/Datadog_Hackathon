import { useState } from "react";
import { ApiError, validateCoupon, type AppliedCoupon } from "../../lib/api.js";

interface CouponFieldProps {
  appliedCoupon: AppliedCoupon | undefined;
  onApply: (coupon: AppliedCoupon) => void;
}

const S = {
  couponLabel: {
    display: "block" as const,
    fontSize: "var(--text-xs)",
    color: "var(--text-2)",
    marginBottom: "var(--space-2)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  couponRow: {
    display: "flex",
    gap: "var(--space-2)",
    marginBottom: "var(--space-4)",
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
} as const;

export function CouponField({ appliedCoupon, onApply }: CouponFieldProps): JSX.Element {
  const [coupon, setCoupon] = useState("");
  const [couponError, setCouponError] = useState<string | undefined>();

  async function applyCouponClick(): Promise<void> {
    setCouponError(undefined);
    const code = coupon.trim();
    if (!code) return;
    try {
      const result = await validateCoupon(code);
      onApply(result);
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 404
          ? "Invalid coupon"
          : err instanceof Error ? err.message : "Failed to validate";
      setCouponError(message);
    }
  }

  return (
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
  );
}
