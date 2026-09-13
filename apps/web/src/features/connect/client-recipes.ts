export type Recipe = Readonly<{ id: string; label: string; eyebrow: string; summary: string; code: string; note: string }>;

export const agentClients = [
  { name: "Claude Code", mark: "C", command: "claude mcp add --scope project blockterms -- node \"$PWD/apps/mcp/dist/index.js\"", check: "claude mcp list" },
  { name: "Codex", mark: "X", command: "codex mcp add blockterms -- node \"$PWD/apps/mcp/dist/index.js\"", check: "codex mcp list" },
  { name: "OpenCode", mark: "O", command: "opencode mcp add blockterms -- node \"$PWD/apps/mcp/dist/index.js\"", check: "opencode mcp list" },
] as const;

export const interfaceRecipes: Recipe[] = [
  {
    id: "cli", label: "CLI", eyebrow: "Shell + CI", summary: "Use JSON stdout for scripts, operators, and coding agents. The workspace command is available now; the npx form becomes available when the package is published.",
    code: ["# Build and use the workspace binary", "pnpm agent:build", "pnpm agent:cli -- market list --query liquidity", "pnpm agent:cli -- market get same-block-liquidity", "", "# Published package form", "npx blockterms market list --query liquidity"].join("\n"),
    note: "The CLI stores local simulation orders under .blockterms and can target a running API with BLOCKTERMS_API_URL.",
  },
  {
    id: "sdk", label: "TypeScript SDK", eyebrow: "Node agents", summary: "Import the typed client directly when BlockTerms is part of a TypeScript agent or service.",
    code: ["import { createLocalClient } from '@blockterms/sdk/local';", "", "const client = createLocalClient({", "  storePath: '.blockterms/orders.json',", "  marketplaceStorePath: '.blockterms/marketplace.json',", "});", "", "const products = await client.listProducts({ query: 'liquidity' });", "const product = await client.getProduct(products[0].manifest.slug);", "console.log(product.manifest.version);"].join("\n"),
    note: "The local transport and HTTP transport implement the same BlockTermsClient contract.",
  },
  {
    id: "rest", label: "REST API", eyebrow: "Any runtime", summary: "Start the credential-free local API and call the same marketplace contracts from any language.",
    code: ["# Terminal 1", "pnpm agent:serve", "", "# Terminal 2", "curl -s 'http://localhost:8787/v1/marketplace/products?query=liquidity'", "curl -s 'http://localhost:8787/v1/capabilities'"].join("\n"),
    note: "Set BLOCKTERMS_API_TOKEN to require bearer authentication. Secrets never appear in responses.",
  },
  {
    id: "mcp", label: "MCP stdio", eyebrow: "Agent clients", summary: "Run a protocol-native stdio server that exposes marketplace and order tools with structuredContent.",
    code: ["# Build and start the server", "pnpm agent:build", "pnpm agent:mcp", "", "# Verify initialization, tool discovery, and calls", "pnpm --filter @blockterms/mcp test", "pnpm market:e2e"].join("\n"),
    note: "The smoke test launches the real process, initializes MCP, lists tools, submits a product, runs a simulated order, and reads its result.",
  },
];
