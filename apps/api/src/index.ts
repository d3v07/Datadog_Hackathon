import { serve } from "@hono/node-server";
import { buildApp } from "./server.js";
import { env } from "./env.js";
import { loadSeeds } from "./seed/loader.js";
import { migrate } from "./db/migrate.js";

async function main(): Promise<void> {
  const e = env();
  loadSeeds();
  await migrate();
  const app = buildApp();
  serve({ fetch: app.fetch, port: e.PORT });
  // eslint-disable-next-line no-console
  console.log(`Redline API listening on http://localhost:${e.PORT}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start:", err);
  process.exit(1);
});
