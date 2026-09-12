# BlockTerms

BlockTerms is a fresh ETHOnline 2026 project for purchasing live blockchain data with explicit delivery terms.

An agent requests a narrowly scoped snapshot, compares signed provider quotes, reserves provider collateral, pays through Hedera x402 using Blocky402, and checks the returned state witness. A valid delivery is accepted. An invalid or late final delivery can trigger a separate warranty transfer from the provider's reserved collateral.

## Status

The web MVP and production-local agent runtime are implemented. The runtime has one durable order service exposed through a TypeScript SDK, REST API, `npx` CLI, and MCP stdio server. Deterministic simulation works without credentials. Live adapters for two standardized Graph deployments, bounded EIP-1186 data, and Hedera x402 are implemented and remain gated on funded accounts and owner-supplied endpoints. No live transaction evidence is claimed before those inputs exist.

## Local quickstart

Requirements: Node.js 22.13.1 or newer and pnpm 10.12.1.

```bash
pnpm install --frozen-lockfile
pnpm agent:e2e
pnpm agent:cli -- example --mode simulation
pnpm agent:cli -- submit --file examples/requests/simulation.json --run
```

The final command prints one JSON order. Local state defaults to `.blockterms/orders.json`; override it with `BLOCKTERMS_STORE_PATH`.

Start the HTTP service:

```bash
pnpm agent:serve
curl http://127.0.0.1:8787/health
curl http://127.0.0.1:8787/v1/capabilities
```

Use `pnpm agent:mcp` as the MCP stdio command. See [agent interfaces](docs/agent-interfaces.md) for the SDK, CLI, HTTP, and MCP contracts and [runtime architecture](docs/architecture/agent-runtime.md) for persistence and live-mode behavior.

## Target sponsor tracks

- Primary: Hedera — AI & Agentic Payments
- Secondary: The Graph — Composable or Standardized Graph Products
- Conditional third: Bazantic — Sponsor API Recipe, only after its technical gate passes

This is a new project. Continuity tracks are outside scope.

## Product surfaces

- `/` — single-viewport marketing landing page on desktop
- `/how-it-works` — request, payment, delivery, verification, warranty
- `/proofs` — proof scope and trust boundaries
- `/providers` — provider collateral and service publication
- `/demo` — buyer-agent product console
- `/docs` — developer onboarding and protocol documentation
- `/product` — product scope and current release boundary
- `/developers` — implementation entry points and integration status

## Design and delivery documents

- [Product and web design](docs/superpowers/specs/2026-09-10-blockterms-product-and-web-design.md)
- [Product brief](docs/product/product-brief.md)
- [Sponsor qualification matrix](docs/sponsor-requirements/qualification-matrix.md)
- [Trust model](docs/architecture/trust-model.md)
- [Agent runtime architecture](docs/architecture/agent-runtime.md)
- [SDK, API, CLI, and MCP guide](docs/agent-interfaces.md)
- [Vercel deployment approach](docs/deployment/vercel.md)
- [MotionSites adaptation prompt](docs/prompts/motionsites-blockterms.md)
- [Orca/Codex session prompt](docs/prompts/orca-codex-session.md)
- [Phase 0 and web foundation implementation plan](docs/superpowers/plans/2026-09-10-phase0-and-web-foundation.md)

## Live configuration

Copy `.env.example` into your local secret manager or shell environment. Live mode requires two distinct compatible Graph endpoints, one EVM JSON-RPC endpoint that supports `eth_getProof`, a funded Hedera payer, an expected Hedera payee and asset, and a real x402 resource URL in the submitted request.

`mode: "live"` returns `configuration_required` before any network call when required values are missing. `mode: "auto"` selects simulation before execution and records only missing variable names. Once a live run starts, an upstream failure is stored as a failure; the runtime never substitutes simulation output.

## Platform references

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Vercel monorepos](https://vercel.com/docs/monorepos)

## Core claim

> BlockTerms binds a paid, standardized multi-protocol snapshot to a specific block and selected storage fields, then resolves a failed commitment from pre-reserved provider collateral without an LLM judge.

The claim is deliberately narrow. It does not establish the completeness of a Graph query, financial safety, APY correctness, or trustless source-chain finality.
