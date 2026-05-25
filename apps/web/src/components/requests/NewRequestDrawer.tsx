import { useCallback, useEffect, useRef, useState } from "react";
import { Drawer } from "../Drawer.js";
import { createRequest, RequestsApiError } from "./api.js";
import type { RequestDto } from "./types.js";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (req: RequestDto) => void;
}

interface FormState {
  vendorName: string;
  category: string;
  expectedSpendUsd: string;
  justification: string;
}

const DEFAULT_FORM: FormState = {
  vendorName: "",
  category: "devtools",
  expectedSpendUsd: "",
  justification: "",
};

const CATEGORY_OPTIONS = [
  "devtools",
  "productivity",
  "communication",
  "analytics",
  "security",
  "observability",
  "infrastructure",
  "data",
  "compliance",
  "contracts",
  "dpa",
  "payments",
  "spend",
] as const;

const SIMILAR_TOOLS: Record<string, ReadonlyArray<{ name: string; category: string }>> = {
  linear: [{ name: "Asana", category: "Productivity" }],
  monday: [
    { name: "Asana", category: "Productivity" },
    { name: "Jira", category: "Engineering" },
  ],
  vercel: [
    { name: "Netlify", category: "Hosting" },
    { name: "AWS Amplify", category: "Hosting" },
  ],
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "var(--text-sm)",
  color: "var(--text-2)",
  marginBottom: "var(--space-1)",
};

interface FieldErrors {
  vendorName?: string;
  expectedSpendUsd?: string;
  justification?: string;
}

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  if (form.vendorName.trim().length < 2) {
    errors.vendorName = "Vendor name is required (at least 2 characters).";
  }
  const spend = Number(form.expectedSpendUsd);
  if (!Number.isFinite(spend) || spend < 0) {
    errors.expectedSpendUsd = "Expected spend must be 0 or greater.";
  }
  if (form.justification.trim().length < 20) {
    errors.justification = "Justification must be at least 20 characters.";
  }
  return errors;
}

export function NewRequestDrawer({ open, onClose, onCreated }: Props): JSX.Element {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [matches, setMatches] = useState<ReadonlyArray<{ name: string; category: string }>>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onVendorChange = useCallback((v: string) => {
    setForm((p) => ({ ...p, vendorName: v }));
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setMatches(SIMILAR_TOOLS[v.trim().toLowerCase()] ?? []);
    }, 300);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const handleClose = useCallback(() => {
    setForm(DEFAULT_FORM);
    setMatches([]);
    setErrors({});
    setServerError(null);
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const validation = validate(form);
      setErrors(validation);
      if (Object.keys(validation).length > 0) return;
      setSubmitting(true);
      setServerError(null);
      try {
        const created = await createRequest({
          vendorName: form.vendorName.trim(),
          category: form.category,
          expectedSpendUsd: Number(form.expectedSpendUsd),
          justification: form.justification.trim(),
          similarTools: matches.map((m) => m.name),
        });
        onCreated(created);
        handleClose();
      } catch (err) {
        const msg =
          err instanceof RequestsApiError
            ? err.message
            : "Failed to submit request. Try again.";
        setServerError(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [form, matches, onCreated, handleClose],
  );

  const field = (id: string, label: string, el: React.ReactNode, error?: string) => (
    <div>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      {el}
      {error && (
        <p
          role="alert"
          style={{ margin: "var(--space-1) 0 0", fontSize: "var(--text-xs)", color: "var(--danger)" }}
        >
          {error}
        </p>
      )}
    </div>
  );

  return (
    <Drawer open={open} onClose={handleClose} title="New request">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }} noValidate>
        {field(
          "req-vendor",
          "Vendor name",
          <>
            <input
              id="req-vendor"
              className="input"
              type="text"
              value={form.vendorName}
              onChange={(e) => onVendorChange(e.target.value)}
              placeholder="e.g. Linear"
              aria-invalid={errors.vendorName ? true : undefined}
            />
            {matches.length > 0 && (
              <div
                style={{
                  marginTop: "var(--space-2)",
                  padding: "var(--space-3)",
                  background: "rgba(217,119,6,0.06)",
                  border: "1px solid rgba(217,119,6,0.20)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--text-sm)",
                  color: "var(--text-2)",
                }}
              >
                <div style={{ fontWeight: 500, color: "var(--warning)", marginBottom: "var(--space-1)" }}>
                  Similar tools you may already own:
                </div>
                <ul style={{ margin: 0, paddingLeft: "var(--space-4)" }}>
                  {matches.map((t) => (
                    <li key={t.name}>
                      {t.name} ({t.category})
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: "var(--space-1)", color: "var(--text-muted)", fontStyle: "italic" }}>
                  Consider consolidating before approving.
                </div>
              </div>
            )}
          </>,
          errors.vendorName,
        )}
        {field(
          "req-category",
          "Category",
          <select
            id="req-category"
            className="input"
            value={form.category}
            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>,
        )}
        {field(
          "req-spend",
          "Expected annual spend ($)",
          <input
            id="req-spend"
            className="input"
            type="number"
            min={0}
            value={form.expectedSpendUsd}
            onChange={(e) => setForm((p) => ({ ...p, expectedSpendUsd: e.target.value }))}
            placeholder="12000"
            aria-invalid={errors.expectedSpendUsd ? true : undefined}
          />,
          errors.expectedSpendUsd,
        )}
        {field(
          "req-justification",
          "Business justification",
          <textarea
            id="req-justification"
            className="input"
            value={form.justification}
            onChange={(e) => setForm((p) => ({ ...p, justification: e.target.value }))}
            placeholder="Describe why this tool is needed..."
            rows={4}
            style={{ height: "auto", resize: "vertical" }}
            aria-invalid={errors.justification ? true : undefined}
          />,
          errors.justification,
        )}
        {serverError && (
          <p role="alert" style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--danger)" }}>
            {serverError}
          </p>
        )}
        <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }} disabled={submitting}>
          {submitting ? "Submitting..." : "Submit request"}
        </button>
      </form>
    </Drawer>
  );
}
