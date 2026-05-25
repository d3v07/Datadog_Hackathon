import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environmentMatchGlobs: [
      ["tests/web/**/*.test.tsx", "jsdom"],
      ["**/tests/web/**/*.test.tsx", "jsdom"],
    ],
    setupFiles: ["tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@unsyphn/shared": resolve(__dirname, "packages/shared/src/index.ts"),
      "@unsyphn/shared/": resolve(__dirname, "packages/shared/src/"),
    },
  },
});
