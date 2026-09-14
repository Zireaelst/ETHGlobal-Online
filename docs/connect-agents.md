# Connect agents to BlockTerms

BlockTerms exposes one marketplace and order runtime through a TypeScript SDK, REST API, JSON CLI, and MCP server. The local `Simulation` profile requires no keys. It creates deterministic educational results and never claims payment or chain evidence.

Run all commands from the repository root. Install and build first:

```bash
pnpm install --frozen-lockfile
pnpm agent:build
```

## Claude Code

Register the built MCP process in the current project:

```bash
claude mcp add --scope project blockterms -- node "$PWD/apps/mcp/dist/index.js"
claude mcp list
```

Start Claude Code from the same project and ask it to use BlockTerms to list products. Claude Code launches the configured command over `stdio`; the server reserves stdout for MCP messages and sends diagnostics to stderr.

## Codex

Current Codex CLI builds support a local stdio command after `--`:

```bash
codex mcp add blockterms -- node "$PWD/apps/mcp/dist/index.js"
codex mcp list
```

The command writes the MCP entry to Codex configuration. Remove it later with `codex mcp remove blockterms`.

## OpenCode

OpenCode V2 accepts a local server command after `--`:

```bash
opencode mcp add blockterms -- node "$PWD/apps/mcp/dist/index.js"
opencode mcp list
```

The equivalent project configuration is:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "servers": {
      "blockterms": {
        "type": "local",
        "command": ["node", "/absolute/path/to/ETHGlobal-Online/apps/mcp/dist/index.js"],
        "cwd": "/absolute/path/to/ETHGlobal-Online",
        "environment": {
          "BLOCKTERMS_STORE_PATH": ".blockterms/orders.json",
          "BLOCKTERMS_MARKETPLACE_STORE_PATH": ".blockterms/marketplace.json"
        }
      }
    }
  }
}
```

## Generic MCP stdio client

Clients that accept the common `mcpServers` shape can launch the same executable:

```json
{
  "mcpServers": {
    "blockterms": {
      "command": "node",
      "args": ["/absolute/path/to/ETHGlobal-Online/apps/mcp/dist/index.js"],
      "cwd": "/absolute/path/to/ETHGlobal-Online",
      "env": {
        "BLOCKTERMS_STORE_PATH": ".blockterms/orders.json",
        "BLOCKTERMS_MARKETPLACE_STORE_PATH": ".blockterms/marketplace.json"
      }
    }
  }
}
```

The lifecycle-oriented tools are:

- `blockterms_list_products`
- `blockterms_get_product`
- `blockterms_create_quote`
- `blockterms_purchase`
- `blockterms_get_order`
- `blockterms_get_result`

The original detailed tools remain available for compatibility, including product submission/review, bundle creation, providers, status, capabilities, and order listing.

Verify the real process and protocol with:

```bash
pnpm --filter @blockterms/mcp test
pnpm market:e2e
```

The first test spawns `apps/mcp/dist/index.js`, performs MCP initialization, lists tools, invokes marketplace operations, runs a simulation order, and retrieves structured content. The marketplace test exercises SDK, REST, CLI, and MCP against shared persistent stores.

## CLI

The workspace binary is usable now:

```bash
pnpm agent:cli -- products list --query liquidity
pnpm agent:cli -- products get same-block-liquidity
pnpm agent:cli -- quotes create --file examples/requests/simulation.json
pnpm agent:cli -- orders purchase ORDER_ID
pnpm agent:cli -- orders status ORDER_ID
pnpm agent:cli -- orders result ORDER_ID
```

After the `blockterms` package is published to npm, replace `pnpm agent:cli --` with `npx blockterms`. Each successful command writes JSON to stdout. Errors and diagnostics go to stderr with stable nonzero exit codes.

## REST API

Start the API and query the marketplace:

```bash
pnpm agent:serve
curl -s 'http://127.0.0.1:8787/v1/marketplace/products?query=liquidity'
curl -s 'http://127.0.0.1:8787/v1/capabilities'
```

Set `BLOCKTERMS_API_URL=http://127.0.0.1:8787` to make the CLI and HTTP SDK use this process. Set `BLOCKTERMS_API_TOKEN` if the service should require a bearer token.

## TypeScript SDK

```ts
import { createLocalClient } from "@blockterms/sdk/local";

const client = createLocalClient({
  storePath: ".blockterms/orders.json",
  marketplaceStorePath: ".blockterms/marketplace.json",
});

const products = await client.listProducts({ query: "liquidity" });
const passport = await client.getProduct(products[0].manifest.slug);
const quote = await client.submit(requestWithPinnedMarketplaceTerms);
const completed = await client.run(quote.id);
const result = await client.getResult(completed.id);
```

Use `createHttpClient({ baseUrl, token })` when the runtime is a separate process.

## Live mode

Simulation never becomes live implicitly after execution starts. Live mode requires the variables documented in `.env.example`, funded Hedera payer access, supported Graph endpoints, an EVM RPC with `eth_getProof`, and a real x402 resource. Missing configuration returns only missing variable names. Do not place private keys or tokens in MCP configuration committed to git; reference inherited environment variables instead.
