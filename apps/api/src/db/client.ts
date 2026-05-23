import { createClient, type ClickHouseClient } from "@clickhouse/client";
import { env } from "../env.js";

let cached: ClickHouseClient | undefined;

export function clickhouse(): ClickHouseClient {
  if (cached) return cached;
  const e = env();
  cached = createClient({
    url: e.CLICKHOUSE_URL,
    username: e.CLICKHOUSE_USER,
    password: e.CLICKHOUSE_PASSWORD,
    database: e.CLICKHOUSE_DATABASE,
    clickhouse_settings: {
      async_insert: 1,
      wait_for_async_insert: 0,
      max_execution_time: 10,
    },
  });
  return cached;
}

export async function closeClickhouse(): Promise<void> {
  if (cached) {
    await cached.close();
    cached = undefined;
  }
}
