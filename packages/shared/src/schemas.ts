import { z } from "zod";

// Branded primitives reused across schemas.
export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

export const Iso8601Schema = z.string().datetime({ offset: true });

export const VendorTierSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

export const DataClassSchema = z.enum(["pii", "phi", "financial", "content"]);

export const VendorContractSchema = z.object({
  renewsAt: IsoDateSchema,
  annualSpendUsd: z.number().int().nonnegative(),
  seatCount: z.number().int().positive(),
});

// Issue #2 — the Add Vendor form body. Acceptance criteria require: name,
// homepageUrl, ownerId, dataClasses; tier is needed by the API contract.
export const VendorCreateSchema = z.object({
  name: z.string().trim().min(2, "must be at least 2 characters").max(60),
  homepageUrl: z
    .string()
    .trim()
    .url("must be a valid URL")
    .max(2048)
    .refine((u) => u.startsWith("http://") || u.startsWith("https://"), {
      message: "must be http(s)",
    }),
  ownerId: z.string().min(1),
  tier: VendorTierSchema,
  dataClasses: z.array(DataClassSchema).default([]),
  contract: VendorContractSchema.optional(),
});

export type VendorCreateInput = z.infer<typeof VendorCreateSchema>;

// Standard error envelope (handoff/API §01).
export const ApiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
    requestId: z.string().optional(),
  }),
});

// Stable kebab-case error codes used across the API. Clients switch on these.
export const ErrorCodes = {
  ValidationFailed: "validation-failed",
  Unauthenticated: "unauthenticated",
  Forbidden: "forbidden",
  NotFound: "not-found",
  Conflict: "conflict",
  Duplicate: "duplicate",
  DiscoveryIncomplete: "discovery-incomplete",
  Unprocessable: "unprocessable",
  Internal: "internal",
  UpstreamFailed: "upstream-failed",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// SSE event payload schemas — used by client-side validation of incoming events.
export const SchedulerTickEventSchema = z.object({
  vendorId: z.string(),
  runId: z.string(),
  startedAt: Iso8601Schema,
});

export const RunStageEventSchema = z.object({
  runId: z.string(),
  vendorId: z.string(),
  stage: z.enum(["fetch", "diff", "reason", "classify", "route", "publish"]),
  status: z.enum(["started", "completed", "failed", "skipped"]),
  durationMs: z.number().nonnegative().optional(),
});

export const RunCompletedEventSchema = z.object({
  runId: z.string(),
  vendorId: z.string(),
  status: z.enum(["unchanged", "changed", "failed"]),
  endedAt: Iso8601Schema,
  durationMs: z.number().nonnegative(),
  changeReportId: z.string().optional(),
});

// Issue #4 — ChangeReport + evidence brief.

export const SeveritySchema = z.enum(["P1", "P2", "P3"]);

export const ChangeCategorySchema = z.enum([
  "data",
  "pricing",
  "subprocessor",
  "terms",
  "sla",
  "security",
]);

export const MaterialitySchema = z.enum(["material", "minor", "cosmetic"]);

export const ChangeStateSchema = z.enum([
  "new",
  "acknowledged",
  "in-progress",
  "resolved",
  "snoozed",
]);

export const ResolutionSchema = z.enum([
  "accepted",
  "renegotiated",
  "rejected",
  "no-action",
]);

export const CitationSchema = z.object({
  url: z.string().url(),
  quote: z.string().min(1),
  section: z.string().optional(),
  fetchedAt: Iso8601Schema,
  country: z.string().optional(),
});

export const ChangeSchema = z.object({
  id: z.string(),
  category: ChangeCategorySchema,
  summary: z.string().max(280),
  before: z.string(),
  after: z.string(),
  materiality: MaterialitySchema,
  dollarImpact: z
    .object({
      annualUsd: z.number(),
      pctChange: z.number(),
    })
    .optional(),
  // Handoff §03: "Each Change has ≥1 Citation. No citation, no claim."
  citations: z.array(CitationSchema).min(1, "every change needs ≥1 citation"),
});

export const RecommendationSchema = z.object({
  action: z.enum(["renegotiate", "escalate", "accept", "reject"]),
  copy: z.string(),
});

export const ChangeReportSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  vendorId: z.string(),
  runId: z.string(),
  detectedAt: Iso8601Schema,
  severity: SeveritySchema,
  state: ChangeStateSchema,
  acknowledgedAt: Iso8601Schema.optional(),
  snoozedUntil: Iso8601Schema.optional(),
  resolvedAt: Iso8601Schema.optional(),
  resolution: ResolutionSchema.optional(),
  policyFiredId: z.string(),
  policyAlsoMatched: z.array(z.string()).default([]),
  changes: z.array(ChangeSchema).min(1, "ChangeReport needs ≥1 change"),
  recommendation: RecommendationSchema,
  sensoUrl: z.string().url().optional(),
  ownerId: z.string(),
});

export const EvidenceBriefResponseSchema = z.object({
  changeReport: ChangeReportSchema,
  vendor: z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
  }),
  policyFired: z.object({ id: z.string(), name: z.string() }),
  policyAlsoMatched: z.array(z.object({ id: z.string(), name: z.string() })),
  actionSummary: z.array(
    z.object({
      kind: z.enum([
        "slack",
        "jira",
        "email",
        "calendar",
        "draft",
        "payment",
      ]),
      target: z.string(),
      status: z.enum(["queued", "delivered", "failed", "acknowledged"]),
      firedAt: Iso8601Schema,
    }),
  ),
});
