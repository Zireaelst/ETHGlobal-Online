import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([
    "**/node_modules/**",
    "**/.next/**",
    "**/coverage/**",
    "**/dist/**",
    "**/out/**",
    "**/cache/**",
    "**/broadcast/**",
    "**/test-results/**",
    "**/playwright-report/**"
  ])
]);
