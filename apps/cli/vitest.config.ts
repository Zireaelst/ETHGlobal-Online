import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // These integration tests intentionally start multiple isolated CLI processes.
    testTimeout: 20_000,
  },
});
