import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./vitest.setup.ts"],
    // Integration tests boot an in-memory MongoDB (first run downloads a binary).
    testTimeout: 30000,
    hookTimeout: 120000,
  },
});
