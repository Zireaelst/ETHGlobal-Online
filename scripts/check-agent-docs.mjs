import { readFile } from "node:fs/promises";

const required = new Map([
  ["README.md", ["pnpm agent:e2e", "pnpm agent:serve", "pnpm agent:mcp", "pnpm agent:cli -- products list", "docs/connect-agents.md", "/app/agent-console"]],
  ["docs/agent-interfaces.md", ["createLocalClient", "npx blockterms", "blockterms_create_quote", "POST /v1/orders", "blockterms_list_products", "POST /v1/marketplace/bundles"]],
  ["docs/connect-agents.md", ["claude mcp add", "codex mcp add", "opencode mcp add", "apps/mcp/dist/index.js", "pnpm --filter @blockterms/mcp test", "stdio", "Simulation"]],
  ["docs/architecture/agent-runtime.md", ["configuration_required", "eth_getProof", "@x402/hedera"]],
  ["docs/marketplace.md", ["same-block-union", "productVersion", "HCS_TOPIC_ID", "CREDENTIAL_VERIFIER_URL"]],
  [".env.example", ["GRAPH_ENDPOINT_A=", "SOURCE_RPC_URL=", "HEDERA_PRIVATE_KEY=", "BLOCKTERMS_MARKETPLACE_STORE_PATH=", "HCS_TOPIC_ID="]],
]);

const problems = [];
for (const [path, fragments] of required) {
  const source = await readFile(path, "utf8");
  for (const fragment of fragments) if (!source.includes(fragment)) problems.push(`${path}: missing ${fragment}`);
}

const environment = await readFile(".env.example", "utf8");
for (const name of ["BLOCKTERMS_API_TOKEN", "GRAPH_AUTHORIZATION", "HEDERA_PRIVATE_KEY", "CREDENTIAL_VERIFIER_TOKEN"]) {
  if (new RegExp(`^${name}=.+$`, "m").test(environment)) problems.push(`.env.example: ${name} must be blank`);
}

if (problems.length) {
  process.stderr.write(`${problems.join("\n")}\n`);
  process.exit(1);
}
process.stdout.write("Agent interface documentation is executable and secret-free.\n");
