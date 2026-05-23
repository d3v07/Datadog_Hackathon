import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: false,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environmentMatchGlobs: [
      ["tests/web/**", "jsdom"],
    ],
    setupFiles: ["tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@redline/shared": resolve(__dirname, "packages/shared/src"),
    },
  },
});
