import { useEffect, useMemo, useState } from "react";
import type { DataClass, VendorCreateBody, VendorTier } from "@unsyphn/shared";
import { Drawer } from "../Drawer.js";
import { createVendor, type TeamMember } from "../../lib/api.js";
import { ApiError } from "../../lib/api.js";

export type VendorPosture = "ok" | "watch" | "risk";

export interface NewVendorDrawerInitial {
  name?: string;
  homepageUrl?: string;
  category?: string;
  tier?: VendorTier;
  posture?: VendorPosture;
  ownerId?: string;
  annualSpendUsd?: number;
  seatCount?: number;
  renewalDate?: string;
  dataClasses?: DataClass[];
  notes?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (vendorId: string) => void;
  members: ReadonlyArray<TeamMember>;
  categoryOptions: ReadonlyArray<string>;
  initial?: NewVendorDrawerInitial;
}

interface FormState {
  name: string;
  homepageUrl: string;
  category: string;
  tier: VendorTier;
  posture: VendorPosture;
  ownerId: string;
  annualSpendUsd: string;
  seatCount: string;
  renewalDate: string;
  dataClasses: DataClass[];
  notes: string;
}

const DEFAULT_CATEGORIES: ReadonlyArray<string> = [
  "productivity",
  "payments",
  "infrastructure",
  "devtools",
  "analytics",
  "communication",
  "security",
  "design",
  "crm",
  "hr",
  "database",
  "observability",
  "support",
  "marketing",
  "automation",
];

const DATA_CLASSES: ReadonlyArray<{ value: DataClass; label: string }> = [
  { value: "pii", label: "PII" },
  { value: "phi", label: "PHI" },
  { value: "financial", label: "Financial" },
  { value: "content", label: "Content" },
];

function emptyForm(initial: NewVendorDrawerInitial | undefined, fallbackOwner: string): FormState {
  return {
    name: initial?.name ?? "",
    homepageUrl: initial?.homepageUrl ?? "",
    category: initial?.category ?? "productivity",
    tier: initial?.tier ?? 2,
    posture: initial?.posture ?? "ok",
    ownerId: initial?.ownerId ?? fallbackOwner,
    annualSpendUsd:
      initial?.annualSpendUsd !== undefined ? String(initial.annualSpendUsd) : "",
    seatCount: initial?.seatCount !== undefined ? String(initial.seatCount) : "",
    renewalDate: initial?.renewalDate ?? "",
    dataClasses: initial?.dataClasses ?? [],
    notes: initial?.notes ?? "",
  };
}

interface FieldErrors {
  name?: string;
  homepageUrl?: string;
  annualSpendUsd?: string;
  seatCount?: string;
  renewalDate?: string;
}

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  if (form.name.trim().length < 2) {
    errors.name = "Vendor name must be at least 2 characters.";
  }
  const url = form.homepageUrl.trim();
  if (!/^https?:\/\/.+\..+/i.test(url)) {
    errors.homepageUrl = "Homepage must be a valid http(s) URL.";
  }
  if (form.annualSpendUsd.trim() !== "") {
    const n = Number(form.annualSpendUsd);
    if (!Number.isFinite(n) || n < 0) {
      errors.annualSpendUsd = "Annual spend must be 0 or greater.";
    }
  }
  if (form.seatCount.trim() !== "") {
    const n = Number(form.seatCount);
    if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
      errors.seatCount = "Seat count must be a positive whole number.";
    }
  }
  if (form.renewalDate.trim() !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(form.renewalDate)) {
    errors.renewalDate = "Renewal date must be YYYY-MM-DD.";
  }
  // Contract is all-or-nothing per VendorContractSchema. If user fills any
  // of the three, require all three.
  const anyContract = !!(form.annualSpendUsd || form.seatCount || form.renewalDate);
  const fullContract = !!(form.annualSpendUsd && form.seatCount && form.renewalDate);
  if (anyContract && !fullContract) {
    if (!form.annualSpendUsd) errors.annualSpendUsd ??= "Required when seat count or renewal is set.";
    if (!form.seatCount) errors.seatCount ??= "Required when spend or renewal is set.";
    if (!form.renewalDate) errors.renewalDate ??= "Required when spend or seat count is set.";
  }
  return errors;
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#64748b",
  display: "block",
  marginBottom: 6,
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  fontSize: 13,
  border: "1px solid rgba(15,23,42,0.12)",
  borderRadius: 8,
  background: "#ffffff",
  color: "#0f172a",
  fontFamily: "var(--font-text)",
};

const ERROR_STYLE: React.CSSProperties = {
  marginTop: 4,
  fontSize: 12,
  color: "#dc2626",
};

export function NewVendorDrawer({
  open,
  onClose,
  onCreated,
  members,
  categoryOptions,
  initial,
}: Props): JSX.Element {
  const fallbackOwner = useMemo(() => {
    if (members.some((m) => m.id === "usr_priya")) return "usr_priya";
    return members[0]?.id ?? "usr_priya";
  }, [members]);

  const [form, setForm] = useState<FormState>(() => emptyForm(initial, fallbackOwner));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [missingUrls, setMissingUrls] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setForm(emptyForm(initial, fallbackOwner));
      setErrors({});
      setServerError(null);
      setMissingUrls([]);
    }
  }, [open, initial, fallbackOwner]);

  const categories = useMemo(() => {
    const set = new Set<string>([...DEFAULT_CATEGORIES, ...categoryOptions]);
    return [...set].sort();
  }, [categoryOptions]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const toggleDataClass = (cls: DataClass) => {
    setForm((p) => {
      const has = p.dataClasses.includes(cls);
      return {
        ...p,
        dataClasses: has ? p.dataClasses.filter((c) => c !== cls) : [...p.dataClasses, cls],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors = validate(form);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSubmitting(true);
    setServerError(null);
    setMissingUrls([]);

    const body: VendorCreateBody = {
      name: form.name.trim(),
      homepageUrl: form.homepageUrl.trim(),
      ownerId: form.ownerId,
      tier: form.tier,
      dataClasses: form.dataClasses,
    };
    if (form.annualSpendUsd && form.seatCount && form.renewalDate) {
      body.contract = {
        renewsAt: form.renewalDate,
        annualSpendUsd: Number(form.annualSpendUsd),
        seatCount: Number(form.seatCount),
      };
    }

    try {
      const resp = await createVendor(body);
      onCreated(resp.id);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
        if (err.code === "discovery-incomplete" && err.details?.missing) {
          const missing = err.details.missing;
          if (Array.isArray(missing)) {
            setMissingUrls(missing.filter((m): m is string => typeof m === "string"));
          }
        }
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError("Failed to create vendor. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Add new vendor">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="fade-up"
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
        noValidate
      >
        <Field
          id="nv-name"
          label="Name"
          required
          error={errors.name}
          input={
            <input
              id="nv-name"
              type="text"
              className="focus-glow"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="e.g. Linear"
              required
              aria-invalid={errors.name ? true : undefined}
              style={INPUT_STYLE}
            />
          }
        />
        <Field
          id="nv-url"
          label="Homepage URL"
          required
          error={errors.homepageUrl}
          input={
            <input
              id="nv-url"
              type="url"
              className="focus-glow"
              value={form.homepageUrl}
              onChange={(e) => updateField("homepageUrl", e.target.value)}
              placeholder="https://example.com"
              required
              aria-invalid={errors.homepageUrl ? true : undefined}
              style={INPUT_STYLE}
            />
          }
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field
            id="nv-category"
            label="Category"
            input={
              <select
                id="nv-category"
                className="focus-glow"
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
                style={INPUT_STYLE}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            }
          />
          <Field
            id="nv-tier"
            label="Tier"
            input={
              <select
                id="nv-tier"
                className="focus-glow"
                value={form.tier}
                onChange={(e) => updateField("tier", Number(e.target.value) as VendorTier)}
                style={INPUT_STYLE}
              >
                <option value={1}>Tier 1</option>
                <option value={2}>Tier 2</option>
                <option value={3}>Tier 3</option>
              </select>
            }
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field
            id="nv-posture"
            label="Posture"
            input={
              <select
                id="nv-posture"
                className="focus-glow"
                value={form.posture}
                onChange={(e) => updateField("posture", e.target.value as VendorPosture)}
                style={INPUT_STYLE}
              >
                <option value="ok">OK</option>
                <option value="watch">Watch</option>
                <option value="risk">Risk</option>
              </select>
            }
          />
          <Field
            id="nv-owner"
            label="Owner"
            input={
              <select
                id="nv-owner"
                className="focus-glow"
                value={form.ownerId}
                onChange={(e) => updateField("ownerId", e.target.value)}
                style={INPUT_STYLE}
              >
                {members.length === 0 && <option value="usr_priya">Priya Natarajan</option>}
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            }
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field
            id="nv-spend"
            label="Annual spend (USD)"
            error={errors.annualSpendUsd}
            input={
              <input
                id="nv-spend"
                type="number"
                className="focus-glow"
                min={0}
                step={1}
                value={form.annualSpendUsd}
                onChange={(e) => updateField("annualSpendUsd", e.target.value)}
                placeholder="12000"
                aria-invalid={errors.annualSpendUsd ? true : undefined}
                style={INPUT_STYLE}
              />
            }
          />
          <Field
            id="nv-seats"
            label="Seat count"
            error={errors.seatCount}
            input={
              <input
                id="nv-seats"
                type="number"
                className="focus-glow"
                min={1}
                step={1}
                value={form.seatCount}
                onChange={(e) => updateField("seatCount", e.target.value)}
                placeholder="25"
                aria-invalid={errors.seatCount ? true : undefined}
                style={INPUT_STYLE}
              />
            }
          />
        </div>

        <Field
          id="nv-renewal"
          label="Renewal date"
          error={errors.renewalDate}
          input={
            <input
              id="nv-renewal"
              type="date"
              className="focus-glow"
              value={form.renewalDate}
              onChange={(e) => updateField("renewalDate", e.target.value)}
              aria-invalid={errors.renewalDate ? true : undefined}
              style={INPUT_STYLE}
            />
          }
        />

        <div>
          <span style={LABEL_STYLE}>Data classes</span>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {DATA_CLASSES.map((dc) => (
              <label
                key={dc.value}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  color: "#0f172a",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.dataClasses.includes(dc.value)}
                  onChange={() => toggleDataClass(dc.value)}
                />
                {dc.label}
              </label>
            ))}
          </div>
        </div>

        <Field
          id="nv-notes"
          label="Notes"
          input={
            <textarea
              id="nv-notes"
              className="focus-glow"
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Context for the review team."
              rows={3}
              style={{ ...INPUT_STYLE, resize: "vertical" }}
            />
          }
        />

        <div
          role="status"
          aria-live="polite"
          style={{ display: serverError ? "block" : "none" }}
        >
          {serverError && (
            <div
              style={{
                fontSize: 13,
                color: "#dc2626",
                background: "rgba(220,38,38,0.08)",
                padding: "8px 10px",
                borderRadius: 8,
              }}
            >
              {serverError}
              {missingUrls.length > 0 && (
                <div style={{ marginTop: 4, fontSize: 12, color: "#7f1d1d" }}>
                  Missing pages: {missingUrls.join(", ")}. Try a homepage that hosts these.
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="button-pop"
            onClick={onClose}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              border: "1px solid rgba(15,23,42,0.12)",
              borderRadius: 8,
              background: "#ffffff",
              color: "#475569",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="button-pop"
            disabled={submitting}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              border: "1px solid #5E6AD2",
              borderRadius: 8,
              background: submitting ? "#9298d6" : "#5E6AD2",
              color: "#ffffff",
              cursor: submitting ? "wait" : "pointer",
            }}
          >
            {submitting ? "Adding..." : "Add vendor"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}

interface FieldProps {
  id: string;
  label: string;
  input: React.ReactNode;
  error?: string;
  required?: boolean;
}

function Field({ id, label, input, error, required }: FieldProps): JSX.Element {
  return (
    <div>
      <label htmlFor={id} style={LABEL_STYLE}>
        {label}
        {required && (
          <span aria-hidden="true" style={{ color: "#dc2626", marginLeft: 4 }}>
            *
          </span>
        )}
      </label>
      {input}
      {error && (
        <p role="alert" style={ERROR_STYLE}>
          {error}
        </p>
      )}
    </div>
  );
}
