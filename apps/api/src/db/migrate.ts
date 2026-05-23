import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { clickhouse, closeClickhouse } from "./client.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DDL_PATH = resolve(HERE, "ddl.sql");

function splitStatements(sql: string): string[] {
  // Strip `-- ...` line comments, then split on `;` boundaries.
  const stripped = sql
    .split(/\r?\n/)
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
  return stripped
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export async function migrate(): Promise<void> {
  const ddl = readFileSync(DDL_PATH, "utf8");
  const stmts = splitStatements(ddl);
  const ch = clickhouse();
  for (const stmt of stmts) {
    await ch.command({ query: stmt });
    const first = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
    if (first) {
      // eslint-disable-next-line no-console
      console.log(`  ✓ ${first[1]}`);
    }
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  (async () => {
    // eslint-disable-next-line no-console
    console.log("Running DDL migration…");
    try {
      await migrate();
      // eslint-disable-next-line no-console
      console.log("Migration complete.");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Migration failed:", err);
      process.exitCode = 1;
    } finally {
      await closeClickhouse();
    }
  })();
}
