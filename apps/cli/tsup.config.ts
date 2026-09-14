import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  clean: true,
  noExternal: [/^@blockterms\//],
  external: ["@hiero-ledger/sdk"],
});
