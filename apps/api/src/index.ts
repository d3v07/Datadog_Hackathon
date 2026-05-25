import { serve } from "@hono/node-server";
import { buildApp } from "./server.js";
import { env } from "./env.js";
import { loadSeeds, getSeededChangeReports } from "./seed/loader.js";
import { migrate } from "./db/migrate.js";
import { ensureStripeProducts } from "./providers/stripe.js";
import { logger } from "./logger.js";

async function main(): Promise<void> {
  const e = env();
  loadSeeds();
  try {
    await migrate();
  } catch (err) {
    logger.warn({ err }, "ClickHouse migration skipped; DB-backed routes may return errors");
  }
  if (e.STRIPE_SECRET_KEY) {
    try {
      const state = await ensureStripeProducts();
      logger.info({ productId: state.productId, priceId: state.priceId }, "Stripe ready");
    } catch (err) {
      logger.warn({ err }, "Stripe bootstrap failed; billing routes may return upstream errors");
    }
  } else {
    logger.info("Stripe not configured; set STRIPE_SECRET_KEY to enable billing");
  }
  const app = buildApp({ seedChangeReports: getSeededChangeReports() });
  serve({ fetch: app.fetch, port: e.PORT }, (info) => {
    logger.info({ port: info.port }, "Unsyphn API listening");
  });
}

main().catch((err) => {
  logger.error({ err }, "Failed to start API");
  process.exit(1);
});
