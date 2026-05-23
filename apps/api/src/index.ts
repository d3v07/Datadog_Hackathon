import { serve } from "@hono/node-server";
import { buildApp } from "./server.js";
import { env } from "./env.js";
import { loadSeeds } from "./seed/loader.js";
import { migrate } from "./db/migrate.js";
import { ensureStripeProducts } from "./providers/stripe.js";

async function main(): Promise<void> {
  const e = env();
  loadSeeds();
  await migrate();
  if (e.STRIPE_SECRET_KEY) {
    try {
      const state = await ensureStripeProducts();
      // eslint-disable-next-line no-console
      console.log(
        `Stripe ready · product=${state.productId} · price=${state.priceId}`,
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("Stripe bootstrap failed (billing routes will 502):", err);
    }
  } else {
    // eslint-disable-next-line no-console
    console.log("Stripe not configured (set STRIPE_SECRET_KEY to enable billing)");
  }
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
