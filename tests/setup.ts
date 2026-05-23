import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Set env at module-load time so the lazy env() cache in apps/api picks these
// up on first read.
process.env.CLICKHOUSE_URL ??= "https://example.test:8443";
process.env.CLICKHOUSE_USER ??= "test";
process.env.CLICKHOUSE_PASSWORD ??= "test";
process.env.NODE_ENV = "test";
// Vite sets BASE_URL="/" at vitest runtime; force a valid URL so env() passes.
process.env.BASE_URL = "http://localhost:8787";
process.env.PORT ??= "8787";
process.env.STRIPE_SECRET_KEY ??= "sk_test_dummy_for_tests";
process.env.STRIPE_PUBLISHABLE_KEY ??= "pk_test_dummy_for_tests";
process.env.STRIPE_WEBHOOK_SECRET ??= "whsec_test_signing_secret_used_by_unit_tests";

beforeEach(() => {
  // Same — re-assert in case a test mutated process.env.
  process.env.NODE_ENV = "test";
});

afterEach(() => {
  cleanup();
});
