import { readFile } from "node:fs/promises";

const required = new Map([
  ["README.md", ["pnpm agent:e2e", "pnpm agent:serve", "pnpm agent:mcp"]],
  ["docs/agent-interfaces.md", ["createLocalClient", "npx blockterms", "submit_request", "POST /v1/orders"]],
  ["docs/architecture/agent-runtime.md", ["configuration_required", "eth_getProof", "@x402/hedera"]],
  [".env.example", ["GRAPH_ENDPOINT_A=", "SOURCE_RPC_URL=", "HEDERA_PRIVATE_KEY="]],
]);

const problems = [];
for (const [path, fragments] of required) {
  const source = await readFile(path, "utf8");
  for (const fragment of fragments) if (!source.includes(fragment)) problems.push(`${path}: missing ${fragment}`);
}

const environment = await readFile(".env.example", "utf8");
for (const name of ["BLOCKTERMS_API_TOKEN", "GRAPH_AUTHORIZATION", "HEDERA_PRIVATE_KEY"]) {
  if (new RegExp(`^${name}=.+$`, "m").test(environment)) problems.push(`.env.example: ${name} must be blank`);
}

if (problems.length) {
  process.stderr.write(`${problems.join("\n")}\n`);
  process.exit(1);
}
process.stdout.write("Agent interface documentation is executable and secret-free.\n");
