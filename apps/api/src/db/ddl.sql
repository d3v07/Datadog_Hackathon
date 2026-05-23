CREATE TABLE IF NOT EXISTS change_reports (
  id                  String,
  org_id              String,
  vendor_id           String,
  run_id              String,
  detected_at         DateTime64(3, 'UTC'),
  severity            Enum8('P1'=1,'P2'=2,'P3'=3),
  state               LowCardinality(String),
  acknowledged_at     Nullable(DateTime64(3, 'UTC')),
  snoozed_until       Nullable(DateTime64(3, 'UTC')),
  resolved_at         Nullable(DateTime64(3, 'UTC')),
  resolution          LowCardinality(Nullable(String)),
  policy_fired_id     String,
  policy_also_matched Array(String),
  changes             String,
  recommendation      String,
  senso_url           Nullable(String),
  owner_id            String,
  state_note          Nullable(String),
  state_changed_by    Nullable(String),
  updated_at          DateTime64(3, 'UTC') DEFAULT now64(),
  version             UInt32
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (org_id, vendor_id, detected_at, id)
PARTITION BY toYYYYMM(detected_at);
