import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/server.ts"],
  format: ["esm"],
  clean: true,
  noExternal: [/^@blockterms\//],
  external: ["@hiero-ledger/sdk"],
});
