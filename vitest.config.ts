import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@redline/shared": new URL("./packages/shared/src/index.ts", import.meta.url).pathname,
    },
  },
});
