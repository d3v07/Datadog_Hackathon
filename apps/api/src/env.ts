import { z } from "zod";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Tiny .env.local loader — reads KEY=VALUE pairs at repo root. Falls back to
// process.env if a key isn't in the file. Kept dep-free; we don't pull dotenv
// just for this.
function loadRepoDotenv(): void {
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), "../../.env"),
    resolve(process.cwd(), "../../.env.local"),
    resolve(process.cwd(), "../../../.env"),
    resolve(process.cwd(), "../../../.env.local"),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
    return;
  }
}

loadRepoDotenv();

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3005),
  BASE_URL: z.string().url().default("http://localhost:3005"),
  CLICKHOUSE_URL: z.string().url(),
  CLICKHOUSE_USER: z.string().min(1),
  CLICKHOUSE_PASSWORD: z.string().min(1),
  CLICKHOUSE_DATABASE: z.string().min(1).default("default"),
  ADMIN_TOKEN: z.string().min(1).default("demo_admin_2026"),
  SCAN_INTERVAL_SEC: z.coerce.number().int().positive().default(60),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_").optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
