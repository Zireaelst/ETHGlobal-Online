# BlockTerms Product App and Agent Clients Design

**Date:** 2026-09-13  
**Status:** Approved for implementation  
**Scope:** Turn the current proof-focused web experience into a credible multi-page product while preserving the verified marketplace, SDK, REST API, CLI, and MCP behavior already implemented.

## Outcome

BlockTerms will present two connected surfaces:

1. A flowing public landing site that explains the problem, product, use cases, proof model, sponsor integrations, and agent interfaces.
2. A dedicated `/app` product shell where people can browse datasets, inspect terms, buy access, follow order status, view providers, list data, and run the same marketplace workflow through agent-facing interfaces.

The shipped local product must be usable without sponsor credentials in an explicitly labeled simulation profile. Adding credentials later must switch the existing integration boundaries to live execution without changing the public workflow or inventing evidence.

## Product Principles

- The UI presents a working marketplace, not a slide deck or linear demo script.
- Human and agent clients use the same marketplace lifecycle and result shapes.
- Every simulation state is labeled. Live proof, payment, or indexing claims appear only when backed by receipts or evidence.
- A user can move between listings, products, providers, orders, selling, and agent tooling without returning to a marketing page.
- The public site explains enough for a judge to understand the product, then sends them into the app for interaction.
- Sponsor integrations remain functional product boundaries: Hedera for agentic payment and audit anchoring; The Graph for composable standardized data products.

## Route Architecture

### Public site

- `/` — multi-section landing page.
- `/how-it-works` — detailed verification and warranty model.
- `/developers` — SDK, REST, CLI, and MCP overview with installation entry points.
- `/docs` — concise documentation index.
- `/proofs` — trust boundaries and evidence status.

The marketing header contains `Product`, `Use Cases`, `Developers`, and `Docs`, followed by a visually distinct `Open App` action. `Product` and `Use Cases` target sections on the landing page; product operations do not appear as individual marketing navigation items.

### Product app

- `/app` — overview with marketplace activity, recent orders, provider coverage, and integration status.
- `/app/marketplace` — filterable marketplace catalog.
- `/app/marketplace/[slug]` — product page with passport, versions, delivery terms, verification, provider, and purchase action.
- `/app/orders/new` — purchase configuration and quote review.
- `/app/orders/[id]` — persisted order timeline, payment/proof/warranty states, and result retrieval.
- `/app/providers` and `/app/providers/[slug]` — provider discovery and reputation details.
- `/app/sell` — listing studio for datasets, bundles, and credential-gated private data.
- `/app/agent-console` — runnable and copyable interface examples for SDK, REST, CLI, and MCP.

Legacy product routes redirect as follows:

| Existing route | Destination |
| --- | --- |
| `/demo` | `/app/orders/new` |
| `/marketplace` | `/app/marketplace` |
| `/marketplace/[slug]` | `/app/marketplace/[slug]` |
| `/providers` | `/app/providers` |
| `/providers/[slug]` | `/app/providers/[slug]` |
| `/sell` | `/app/sell` |

## Landing Experience

The landing page becomes a scrollable narrative with eight sections:

1. **Hero:** A concise statement about buying verifiable, warranty-backed blockchain data. Primary CTA opens the marketplace; secondary CTA opens the agent console.
2. **Problem:** Data buyers currently coordinate discovery, payment, provenance, terms, and recourse across disconnected systems.
3. **Workflow:** Discover, verify terms, pay, validate delivery, and claim warranty if a committed delivery is invalid or late.
4. **Marketplace preview:** Real catalog fixtures rendered as product cards with prices, networks, proof modes, and provider identity.
5. **Composable and private products:** Standardized multi-protocol bundles plus credential-gated datasets.
6. **Agent-native access:** One lifecycle exposed through the TypeScript SDK, REST API, `npx` CLI, and MCP tools.
7. **Architecture:** Hedera payment/audit boundaries, The Graph data products, deterministic verification, and the explicit trust model.
8. **Final CTA:** Open the product or connect an agent.

Motion remains progressive enhancement. Reduced-motion settings disable nonessential animation, and content remains usable without video or JavaScript-driven transitions.

## App Shell

The app uses a persistent desktop sidebar and compact mobile navigation. The primary destinations are Overview, Marketplace, Orders, Providers, Sell Data, and Agent Console. A global environment badge shows `Simulation` or `Live`; the setting is visible anywhere payment, proof, or external integrations are shown.

The shell provides product context, network/integration health, and a clear route back to the public site. It does not repeat the marketing header.

## Human Marketplace Flow

1. The buyer filters or searches the marketplace.
2. The buyer opens a product and reviews a version-pinned passport: schema, source, terms hash, price, freshness, proof type, warranty terms, and credential requirements.
3. `Buy access` opens `/app/orders/new` with the listing and version preselected.
4. The buyer selects delivery parameters within deterministic allowlists and requests a quote.
5. The UI shows the exact amount, currency/network, expected delivery, warranty, and terms hash before purchase.
6. Purchase creates a persisted local order and advances it through payment, fulfillment, validation, and result states.
7. The order page exposes the returned data, receipts, verification evidence, and warranty outcome. Simulation receipts are visually and structurally distinct from live evidence.

The browser flow must function locally without credentials. It uses the same typed contracts as the external interfaces and a deterministic simulation adapter. Live adapters remain disabled until their required configuration is present.

## Seller Flow

The listing studio supports three product types:

- Verified dataset
- Composable data bundle
- Credentialed private dataset

The form validates provider, schema, price, delivery terms, version, proof policy, warranty policy, and optional credential policy before producing a preview. In local simulation mode, publishing stores the listing in the local marketplace state so it appears in browsing and can be purchased. Live publication is gated by configured persistence and integration credentials.

## Canonical Agent Lifecycle

Every client exposes the same operations and identifiers:

1. `listProducts(filters?)`
2. `getProduct(slug, version?)`
3. `createQuote(request)`
4. `purchase(quoteId)`
5. `getOrder(orderId)`
6. `getResult(orderId)`

The shared request includes listing slug, pinned version, input parameters, maximum budget, buyer identity or credential presentation when required, and execution profile. The shared response includes stable product/quote/order identifiers, current status, terms hash, price, timestamps, evidence references, and a structured error when action is required.

Human-facing pages call the same application service boundary. They may format data for presentation but may not invent additional success states.

## TypeScript SDK

The published workspace SDK offers a typed client over the REST boundary plus an in-process adapter for tests and local integration. Documentation includes a complete marketplace example that discovers a product, requests a quote, purchases it, polls status, and retrieves the result.

The agent console shows a copyable TypeScript sample and its expected structured output for the current simulation profile. A runnable browser action may exercise a safe local web route, but it must identify the route and profile used.

## CLI

The CLI remains runnable from the workspace and through its package binary, with commands designed for automation:

```text
npx @blockterms/cli products list --json
npx @blockterms/cli products get risk-signal-brief --json
npx @blockterms/cli quotes create --product risk-signal-brief --version 1.0.0 --max-budget 1 --json
npx @blockterms/cli orders purchase <quote-id> --json
npx @blockterms/cli orders status <order-id> --json
npx @blockterms/cli orders result <order-id> --json
```

Commands use JSON on stdout and diagnostics on stderr so Claude Code, Codex, OpenCode, shell scripts, and CI jobs can call them reliably. Exit codes distinguish success, invalid input, required credentials, payment failure, verification failure, and unavailable services.

The agent console includes exact setup and command sequences. It does not display a fake terminal execution; evidence shown as executed comes from an actual local API or recorded sanitized run.

## MCP Server and Client Connection

The MCP server uses the standard `stdio` transport as the primary local connection. It exposes tools corresponding to the canonical lifecycle:

- `blockterms_list_products`
- `blockterms_get_product`
- `blockterms_create_quote`
- `blockterms_purchase`
- `blockterms_get_order`
- `blockterms_get_result`

Tool results include human-readable content and typed `structuredContent`. Errors return actionable MCP errors and never encode failure as a successful receipt.

The repository documents and verifies connection instructions for:

- **Claude Code:** add the workspace MCP command with `claude mcp add`, then invoke the tools from a Claude Code session.
- **Codex/OpenAI-compatible MCP clients:** add the same executable command and environment to the client's MCP server configuration.
- **OpenCode and other stdio MCP clients:** configure the package binary, arguments, working directory, and optional API URL with the generic JSON example.

Because client configuration syntax can change, checked-in examples are paired with a protocol-level smoke test that launches the server, performs MCP initialization, lists tools, invokes a marketplace read, and completes a simulated quote/order/result flow. The test proves server compatibility independently of any specific client UI.

## Agent Console

`/app/agent-console` is the judge-facing proof that the product is callable without the frontend. It contains:

- A lifecycle selector and one canonical request payload.
- Tabs for SDK, REST, CLI, and MCP that translate the same action without changing semantics.
- A real REST playground against a local credential-free simulation endpoint.
- Copy controls for commands, configuration, and JSON.
- A structured response viewer with quote/order/result identifiers and evidence status.
- Connection recipes for Claude Code, Codex/OpenAI-compatible clients, and generic stdio clients.
- The exact `pnpm market:e2e` and MCP smoke-test commands used to validate the flow.
- Integration status that separates configured live services from simulation adapters.

The console never suggests that browser JavaScript launched a local CLI or MCP process. Browser-run actions are labeled REST simulation; CLI and MCP sections provide executable commands plus results backed by repository tests or sanitized evidence.

## Data and Persistence

The catalog continues to use the existing marketplace fixtures as the baseline simulation inventory. Local published listings and orders use a small repository abstraction with an in-memory/default implementation suitable for development and tests. The boundary allows a durable store to be attached later without changing routes or client contracts.

Order identifiers and timestamps are generated by the service boundary. Repeated reads return the same order rather than rebuilding a demo response. Version and terms hashes remain pinned from quote creation through result retrieval.

## Error Handling

All interfaces use the same stable error categories:

- `INVALID_INPUT`
- `PRODUCT_NOT_FOUND`
- `VERSION_NOT_FOUND`
- `CREDENTIAL_REQUIRED`
- `BUDGET_EXCEEDED`
- `PAYMENT_REQUIRED`
- `PAYMENT_FAILED`
- `FULFILLMENT_FAILED`
- `VERIFICATION_FAILED`
- `SERVICE_UNAVAILABLE`

The web app turns these into nearby recovery actions. CLI errors return nonzero exit codes and JSON when `--json` is selected. REST errors use appropriate HTTP status codes. MCP errors preserve the category and structured details.

## Accessibility and Responsive Behavior

- All routes use semantic landmarks and ordered heading levels.
- Navigation, tabs, filters, copy buttons, and purchase controls work by keyboard.
- Focus indicators remain visible.
- Status does not rely on color alone.
- Desktop app navigation collapses into a keyboard-accessible mobile menu.
- Tables become labeled cards or horizontally scroll without clipping critical actions.
- Animations respect `prefers-reduced-motion`.

## Verification

Implementation is complete only when the following behavior is verified:

- Landing page sections and navigation render at desktop and mobile widths.
- App routes support direct loading and internal navigation.
- Legacy URLs redirect to their app equivalents.
- A human can browse, quote, buy, inspect status, and retrieve a simulated result through the UI.
- A seller can create a valid local simulation listing and find it in the marketplace.
- REST, SDK, CLI, and MCP complete the same simulated marketplace lifecycle with pinned version and terms hash.
- The MCP protocol smoke test initializes the server, lists tools, calls read tools, and completes the write lifecycle.
- Documentation contains copyable Claude Code, Codex/OpenAI-compatible, OpenCode/generic MCP, CLI, SDK, and REST instructions.
- Existing unit, integration, invariant, typecheck, lint, and production build checks remain green.
- Production deployment returns successful responses for the landing page, `/app`, marketplace, product, order, seller, and agent-console routes.

## Out of Scope

- Custodial wallets or production identity onboarding before credentials are supplied.
- Claims that a complete Graph query, economic metric, or source-chain finality is cryptographically proven.
- Browser execution of local CLI or MCP processes.
- A hosted remote MCP transport; the production-ready local target uses `stdio`.
- Fabricated live transactions, contract addresses, deployment IDs, or customer activity.

