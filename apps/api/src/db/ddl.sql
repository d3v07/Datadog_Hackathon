-- Redline ClickHouse schema · handoff/Data Model §04.
-- All tables are append-only. State transitions ride ReplacingMergeTree's
-- last-write-wins via `updated_at`. Reads should use FINAL on replacing tables.

-- ─── snapshots ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS snapshots (
    id            String,
    org_id        String,
    vendor_id     String,
    run_id        String,
    url           String,
    fetched_at    DateTime64(3, 'UTC'),
    source        LowCardinality(String), -- "nimble" | "seed"
    text          String CODEC(ZSTD(3)),
    hash          FixedString(64),         -- sha256 hex
    source_url    String
)
ENGINE = MergeTree
ORDER BY (org_id, vendor_id, url, fetched_at)
PARTITION BY toYYYYMM(fetched_at);

-- ─── change_reports ──────────────────────────────────
CREATE TABLE IF NOT EXISTS change_reports (
    id                    String,
    org_id                String,
    vendor_id             String,
    run_id                String,
    detected_at           DateTime64(3, 'UTC'),
    severity              Enum8('P1' = 1, 'P2' = 2, 'P3' = 3),
    state                 LowCardinality(String),
    acknowledged_at       Nullable(DateTime64(3, 'UTC')),
    snoozed_until         Nullable(DateTime64(3, 'UTC')),
    resolved_at           Nullable(DateTime64(3, 'UTC')),
    resolution            Nullable(String),
    policy_fired_id       String,
    policy_also_matched   Array(String),
    changes               String, -- JSON of Change[]
    recommendation        String, -- JSON
    senso_url             Nullable(String),
    owner_id              String,
    updated_at            DateTime64(3, 'UTC') DEFAULT now64()
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (org_id, vendor_id, detected_at, id)
PARTITION BY toYYYYMM(detected_at);

-- ─── actions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS actions (
    id                String,
    org_id            String,
    change_report_id  Nullable(String),
    kind              LowCardinality(String),
    target            String,
    payload           String, -- JSON
    fired_at          DateTime64(3, 'UTC'),
    status            LowCardinality(String),
    external_id       Nullable(String),
    error             Nullable(String),
    updated_at        DateTime64(3, 'UTC') DEFAULT now64()
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (org_id, change_report_id, fired_at, id)
PARTITION BY toYYYYMM(fired_at)
SETTINGS allow_nullable_key = 1;

-- ─── agent_runs ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_runs (
    id                String,
    org_id            String,
    vendor_id         String,
    started_at        DateTime64(3, 'UTC'),
    ended_at          Nullable(DateTime64(3, 'UTC')),
    duration_ms       Nullable(UInt32),
    status            LowCardinality(String), -- running | unchanged | changed | failed
    change_report_id  Nullable(String),
    trigger           LowCardinality(String), -- scheduled | admin | first-scan
    error_stage       Nullable(String),
    error_code        Nullable(String),
    error_message     Nullable(String),
    updated_at        DateTime64(3, 'UTC') DEFAULT now64()
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (org_id, vendor_id, started_at, id)
PARTITION BY toYYYYMM(started_at);

-- ─── agent_traces ────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_traces (
    run_id       String,
    stage        LowCardinality(String),
    status       LowCardinality(String),
    at           DateTime64(3, 'UTC'),
    duration_ms  Nullable(UInt32),
    meta         String DEFAULT '{}' -- JSON
)
ENGINE = MergeTree
ORDER BY (run_id, at)
PARTITION BY toYYYYMM(at);

-- ─── evidence_bundles ────────────────────────────────
CREATE TABLE IF NOT EXISTS evidence_bundles (
    id                  String,
    org_id              String,
    vendor_ids          Array(String),
    date_from           Date,
    date_to             Date,
    include_resolved    UInt8,
    note                Nullable(String),
    change_report_ids   Array(String),
    senso_url           Nullable(String),
    created_by          String,
    created_at          DateTime64(3, 'UTC')
)
ENGINE = MergeTree
ORDER BY (org_id, created_at, id);
