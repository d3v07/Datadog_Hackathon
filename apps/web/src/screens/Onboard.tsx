import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  VendorCreateSchema,
  type VendorCreateInput,
  type VendorCreateResponse,
  type DataClass,
} from "@unsyphn/shared";
import { ApiError, createVendor } from "../lib/api.js";
import { useFirstScan } from "../lib/stream.js";

const STAGES = ["fetch", "diff", "reason", "classify", "route", "publish"] as const;
const DATA_CLASSES: readonly DataClass[] = ["pii", "phi", "financial", "content"];
const OWNERS: ReadonlyArray<{ id: string; name: string }> = [
  { id: "usr_priya", name: "Priya Natarajan" },
  { id: "usr_marcus", name: "Marcus Chen" },
  { id: "usr_lin", name: "Lin Park" },
  { id: "usr_jordan", name: "Jordan Wells" },
  { id: "usr_ada", name: "Ada Owens" },
  { id: "usr_devon", name: "Devon Rao" },
];

interface SubmissionState {
  status: "idle" | "submitting" | "submitted" | "error";
  created?: VendorCreateResponse;
  error?: { code: string; message: string };
}

interface OnboardProps {
  prefillTier?: 1 | 2 | 3;
}

export function Onboard({ prefillTier }: OnboardProps = {}): JSX.Element {
  const [submission, setSubmission] = useState<SubmissionState>({
    status: "idle",
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VendorCreateInput>({
    resolver: zodResolver(VendorCreateSchema),
    defaultValues: {
      name: "",
      homepageUrl: "",
      ownerId: "",
      tier: prefillTier ?? 2,
      dataClasses: [],
    },
  });

  const firstScan = useFirstScan(submission.created?.firstScanRunId);

  useEffect(() => {
    if (submission.status !== "error") return;
    const id = setTimeout(() => setSubmission((s) => ({ ...s, status: "idle", error: undefined })), 6000);
    return () => clearTimeout(id);
  }, [submission.status]);

  const onSubmit = async (data: VendorCreateInput): Promise<void> => {
    setSubmission({ status: "submitting" });
    try {
      const created = await createVendor(data);
      setSubmission({ status: "submitted", created });
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmission({
          status: "error",
          error: { code: err.code, message: err.message },
        });
        return;
      }
      setSubmission({
        status: "error",
        error: { code: "internal", message: (err as Error).message },
      });
    }
  };

  if (submission.status === "submitted" && submission.created) {
    return (
      <FirstScanPanel
        response={submission.created}
        status={firstScan.status}
        stages={firstScan.stages}
      />
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit(onSubmit)} noValidate>
      <h1 className="card__title">Add a vendor</h1>
      <p className="card__sub">
        Unsyphn will discover the monitored URLs and queue an immediate first scan.
      </p>

      {submission.status === "error" && submission.error && (
        <div className="alert alert--err" role="alert">
          <strong>{submission.error.code}</strong> — {submission.error.message}
        </div>
      )}

      <div className="field">
        <label htmlFor="vendor-name" className="field__label field__label--required">
          Vendor name
        </label>
        <input
          id="vendor-name"
          type="text"
          autoComplete="off"
          aria-required="true"
          aria-invalid={Boolean(errors.name)}
          {...register("name")}
        />
        {errors.name && <span className="field__error">{errors.name.message}</span>}
      </div>

      <div className="field">
        <label htmlFor="vendor-homepage" className="field__label field__label--required">
          Homepage URL
        </label>
        <input
          id="vendor-homepage"
          type="url"
          placeholder="https://stripe.com"
          autoComplete="off"
          aria-required="true"
          aria-invalid={Boolean(errors.homepageUrl)}
          {...register("homepageUrl")}
        />
        {errors.homepageUrl && (
          <span className="field__error">{errors.homepageUrl.message}</span>
        )}
      </div>

      <div className="field">
        <label htmlFor="vendor-owner" className="field__label field__label--required">
          Owner
        </label>
        <select
          id="vendor-owner"
          aria-required="true"
          aria-invalid={Boolean(errors.ownerId)}
          {...register("ownerId")}
        >
          <option value="">Select an owner…</option>
          {OWNERS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        {errors.ownerId && (
          <span className="field__error">{errors.ownerId.message}</span>
        )}
      </div>

      <div className="field">
        <label htmlFor="vendor-tier">Criticality tier</label>
        <select
          id="vendor-tier"
          aria-invalid={Boolean(errors.tier)}
          {...register("tier", { valueAsNumber: true })}
        >
          <option value={1}>Tier 1 — critical</option>
          <option value={2}>Tier 2 — material</option>
          <option value={3}>Tier 3 — informational</option>
        </select>
        {errors.tier && <span className="field__error">{errors.tier.message}</span>}
      </div>

      <div className="field">
        <label>Data classes</label>
        <Controller
          control={control}
          name="dataClasses"
          render={({ field }) => (
            <div className="checkboxes">
              {DATA_CLASSES.map((dc) => {
                const checked = (field.value ?? []).includes(dc);
                return (
                  <label key={dc} className="checkbox">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = new Set(field.value ?? []);
                        if (e.target.checked) next.add(dc);
                        else next.delete(dc);
                        field.onChange([...next]);
                      }}
                    />
                    {dc}
                  </label>
                );
              })}
            </div>
          )}
        />
      </div>

      <button className="btn" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting…" : "Add vendor"}
      </button>
    </form>
  );
}

interface FirstScanPanelProps {
  response: VendorCreateResponse;
  status: ReturnType<typeof useFirstScan>["status"];
  stages: ReturnType<typeof useFirstScan>["stages"];
}

function FirstScanPanel({ response, status, stages }: FirstScanPanelProps): JSX.Element {
  const isDone = status === "completed-unchanged" || status === "completed-changed";
  return (
    <>
      <div className="card">
        <h1 className="card__title">First scan running</h1>
        <p className="card__sub">
          {response.name} · run <code>{response.firstScanRunId}</code>
        </p>
        {isDone && (
          <div className="alert alert--ok">
            First scan complete — status <strong>{status.replace("completed-", "")}</strong>.
          </div>
        )}
        {status === "failed" && (
          <div className="alert alert--err">First scan failed — see server logs.</div>
        )}
        <div className="stages" role="list">
          {STAGES.map((stage) => {
            const s = stages[stage];
            return (
              <div
                key={stage}
                role="listitem"
                className={`stage ${s ? `stage--${s}` : ""}`}
                data-stage={stage}
              >
                <span className="stage__label">{stage}</span>
                <span className="stage__pill">{s ?? "pending"}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="card">
        <h2 className="card__title">Discovered URLs</h2>
        <dl className="kv">
          {Object.entries(response.discoveredUrls).map(([key, value]) => (
            <div key={key} style={{ display: "contents" }}>
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}
