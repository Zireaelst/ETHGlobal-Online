# Agent interfaces

Run `pnpm agent:build` before using built artifacts directly. `pnpm agent:e2e` builds and exercises the order interfaces. `pnpm market:e2e` exercises marketplace submission, review, discovery, bundling, purchase binding, outcomes, and provider metrics without credentials.

## TypeScript SDK

```ts
import { createLocalClient } from "@blockterms/sdk/local";

const client = createLocalClient({ storePath: ".blockterms/orders.json" });
const submitted = await client.submit(request);
const completed = await client.run(submitted.id);
const status = await client.getStatus(completed.id);
const result = await client.getResult(completed.id);

const products = await client.listProducts({ network: "eip155:1", maxPriceAtomic: "5000000" });
const passport = await client.getProduct(products[0].id);
const providers = await client.listProviders();
```

Use `createHttpClient({ baseUrl, token })` for a remote runtime. Both clients implement the order methods plus `submitProduct`, `reviewProduct`, `getProduct`, `listProducts`, `createBundle`, `listProviders`, `getProvider`, and `recordOutcome`.

## CLI and npx

The workspace command is:

```bash
pnpm agent:cli -- submit --file examples/requests/simulation.json --run
pnpm agent:cli -- list --limit 10
pnpm agent:cli -- status ORDER_ID
pnpm agent:cli -- result ORDER_ID
pnpm agent:cli -- market submit --file examples/marketplace/product.json
pnpm agent:cli -- market list --network eip155:1 --max-price 5000000
pnpm agent:cli -- market get same-block-liquidity
pnpm agent:cli -- providers list
```

After the `blockterms` package is published, the equivalent entry is `npx blockterms`. Successful commands write one JSON value to stdout. Diagnostics use stderr. Exit codes are 2 validation, 3 configuration required, 4 not found, 5 conflict, 6 policy rejected, 7 upstream failure, and 1 internal failure.

Set `BLOCKTERMS_API_URL` to make the CLI use HTTP. Otherwise it uses the atomic local store.

## HTTP

```bash
pnpm agent:serve
curl -X POST http://127.0.0.1:8787/v1/orders \
  -H 'content-type: application/json' \
  --data-binary @examples/requests/simulation.json
```

Endpoints:

- `GET /health`
- `GET /v1/capabilities`
- `POST /v1/orders`
- `GET /v1/orders?limit=50`
- `GET /v1/orders/:id`
- `POST /v1/orders/:id/run`
- `GET /v1/orders/:id/status`
- `GET /v1/orders/:id/result`
- `GET|POST /v1/marketplace/products`
- `GET /v1/marketplace/products/:id-or-slug`
- `POST /v1/marketplace/products/:id/review`
- `POST /v1/marketplace/bundles`
- `GET /v1/marketplace/providers`
- `GET /v1/marketplace/providers/:id`
- `POST /v1/marketplace/outcomes`

The server binds to `127.0.0.1:8787` by default. Set `BLOCKTERMS_API_TOKEN` to require `Authorization: Bearer …` on `/v1` routes. Bodies must be JSON and are limited to 64 KiB by default.

## MCP stdio

Start the server with `pnpm agent:mcp`. A host configuration can use:

```json
{
  "mcpServers": {
    "blockterms": {
      "command": "pnpm",
      "args": ["agent:mcp"],
      "cwd": "/absolute/path/to/ETHGlobal-Online",
      "env": { "BLOCKTERMS_STORE_PATH": ".blockterms/orders.json" }
    }
  }
}
```

The server exposes `submit_request`, `run_order`, `get_order`, `get_status`, `get_result`, `list_orders`, and `get_capabilities`, plus `search_data_products`, `get_data_product`, `submit_data_product`, `review_data_product`, `create_data_bundle`, `list_data_providers`, and `get_data_provider`. Results include MCP structured content and a compact text block. stdout is reserved for protocol messages.

## Request shape

Use [the simulation request](../examples/requests/simulation.json) as the executable example. The Graph block number and witness block hex must identify the same block. Pool count and storage slot count are each limited to three. `maxPaymentAtomic` is a positive base-10 integer string, and metadata is JSON limited to 8 KiB.

A marketplace purchase adds `marketplace.productId`, `marketplace.productVersion`, and `marketplace.providerId`. Before any adapter or payment runs, the service requires the selected product to remain active and match its provider, version, resource URL, payment network, and request budget.
