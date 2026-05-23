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
