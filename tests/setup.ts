import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";

beforeEach(() => {
  process.env.CLICKHOUSE_URL = "https://example.test:8443";
  process.env.CLICKHOUSE_USER = "test";
  process.env.CLICKHOUSE_PASSWORD = "test";
  process.env.NODE_ENV = "test";
});

afterEach(() => {
  cleanup();
});
