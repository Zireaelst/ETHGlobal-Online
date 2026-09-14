# Verified Data Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a curated marketplace where humans and agents publish, discover, bundle, purchase, and evaluate verifiable data products through the existing BlockTerms lifecycle.

**Architecture:** A storage-agnostic marketplace service owns validated product/provider state beside the existing order service. Zod contracts are shared by local and HTTP SDK transports, CLI and MCP adapt those methods, and Next.js pages render the same product passports and objective reputation model. Optional HCS, credential, and content-addressed storage integrations remain ports and cannot weaken payment or proof invariants.

**Tech Stack:** TypeScript 7, Zod 4, Vitest, Node.js atomic file storage, Next.js 16, React 19, Commander, MCP SDK, pnpm workspaces.

## Global Constraints

- Existing Hedera x402 payment and Graph proof/warranty semantics must remain unchanged.
- Only active, curator-approved products with a supported proof profile and at least 10000 collateral basis points are purchasable.
- `simulation` and `live` marketplace outcomes remain separate in storage, API, UI, and reputation.
- Product manifests cannot contain secrets and are capped at 32 KiB serialized.
- Bundles contain two to five active components and publish explicit versioned lineage.
- Credentials are eligibility signals and never delivery correctness evidence.
- All SDK, API, CLI, MCP, and web claims must come from the same validated contracts.

---

### Task 1: Marketplace contracts

**Files:**
- Create: `packages/contracts/src/marketplace.ts`
- Create: `packages/contracts/src/marketplace.test.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/contracts/tsconfig.build.json`

**Interfaces:**
- Produces: `DataProductSchema`, `SubmitProductRequestSchema`, `ReviewProductRequestSchema`, `ProductFilterSchema`, `ProviderProfileSchema`, bundle and outcome schemas plus inferred TypeScript types.

- [ ] Write failing tests for manifest limits, secret-bearing keys, lifecycle records, collateral bounds, bundle size, credential expiry metadata, and filters.
- [ ] Run `pnpm --filter @blockterms/contracts test -- marketplace.test.ts` and confirm missing exports fail.
- [ ] Implement the strict schemas and parsers.
- [ ] Re-run the focused contract tests and the full contracts package tests.
- [ ] Commit with `feat(contracts): define marketplace product passports`.

### Task 2: Atomic marketplace repository

**Files:**
- Create: `packages/core/src/marketplace-store.ts`
- Create: `packages/core/src/marketplace-store.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: `DataProduct`, `ProviderProfile`.
- Produces: `MarketplaceRepository`, `JsonFileMarketplaceRepository`, atomic compare-and-swap updates.

- [ ] Write failing tests for create/get/list, slug uniqueness, persistence across clients, corrupt storage, and concurrent revision conflict.
- [ ] Run the focused test and confirm the repository does not exist.
- [ ] Implement temp-file-plus-rename persistence with per-process write serialization.
- [ ] Re-run focused and core package tests.
- [ ] Commit with `feat(core): persist marketplace catalog atomically`.

### Task 3: Curated publication lifecycle

**Files:**
- Create: `packages/core/src/marketplace-service.ts`
- Create: `packages/core/src/marketplace-service.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Produces: `MarketplaceService.submitProduct`, `reviewProduct`, `getProduct`, `listProducts`, `createBundle`, `listProviders`, `getProvider`, `recordOutcome`.

- [ ] Write failing behavior tests for draft submission, approval gates, rejection, suspension, filtering, active slug uniqueness, and immutable active versions.
- [ ] Run focused tests and confirm expected failures.
- [ ] Implement lifecycle and deterministic filtering without hidden ranking scores.
- [ ] Re-run focused and core tests.
- [ ] Commit with `feat(core): curate marketplace publication lifecycle`.

### Task 4: Bundle lineage and outcome reputation

**Files:**
- Modify: `packages/core/src/marketplace-service.test.ts`
- Modify: `packages/core/src/marketplace-service.ts`

**Interfaces:**
- Consumes: active component products and finalized order outcome records.
- Produces: validated `same-block-union` bundles and objective `ProviderProfile.metrics`.

- [ ] Write failing tests for inactive components, schema/network mismatch, duplicate aliases, two-to-five limits, duplicate outcome idempotency, simulation separation, and latency percentiles.
- [ ] Run focused tests and confirm failures describe missing behavior.
- [ ] Implement bundle validation and deterministic metric calculation.
- [ ] Re-run focused and core tests.
- [ ] Commit with `feat(core): compose products and derive provider reputation`.

### Task 5: Marketplace SDK

**Files:**
- Modify: `packages/sdk/src/client.ts`
- Modify: `packages/sdk/src/local.ts`
- Modify: `packages/sdk/src/http.ts`
- Modify: `packages/sdk/src/index.ts`
- Modify: `packages/sdk/src/client.test.ts`
- Modify: `packages/sdk/src/http.test.ts`

**Interfaces:**
- Produces: local and HTTP client methods matching every public marketplace service method.

- [ ] Write failing local and HTTP transport contract tests for product discovery, submission, review, bundles, providers, and status-safe errors.
- [ ] Run SDK tests and confirm missing method failures.
- [ ] Extend `BlockTermsTransport`, local composition, and HTTP routes used by the client.
- [ ] Re-run SDK tests and typecheck.
- [ ] Commit with `feat(sdk): expose marketplace capabilities`.

### Task 6: Marketplace HTTP API

**Files:**
- Modify: `services/api/src/server.ts`
- Modify: `services/api/src/cli.ts`
- Modify: `services/api/src/server.test.ts`

**Interfaces:**
- Produces: `/v1/marketplace/products`, `/v1/marketplace/products/:id`, review, bundle, providers, and outcome endpoints.

- [ ] Write failing loopback HTTP tests for all routes, invalid JSON, body size, filters, curator authentication, and safe error mapping.
- [ ] Run focused API tests and confirm 404/missing behavior.
- [ ] Add route parsing and inject one marketplace client into the server.
- [ ] Re-run API tests and service typecheck.
- [ ] Commit with `feat(api): serve the curated data marketplace`.

### Task 7: CLI marketplace commands

**Files:**
- Modify: `apps/cli/src/index.ts`
- Modify: `apps/cli/src/index.test.ts`
- Create: `examples/marketplace/product.json`
- Create: `examples/marketplace/bundle.json`

**Interfaces:**
- Produces: `market list|get|submit|review|bundle` and `providers list|get` commands with JSON stdout and stable exit codes.

- [ ] Write failing CLI tests using temporary stores and fixture files.
- [ ] Run CLI tests and confirm unknown commands fail.
- [ ] Implement commands and reusable JSON-file parsing.
- [ ] Re-run CLI tests and build.
- [ ] Commit with `feat(cli): manage marketplace products`.

### Task 8: MCP marketplace tools

**Files:**
- Modify: `apps/mcp/src/server.ts`
- Modify: `apps/mcp/src/server.test.ts`
- Modify: `apps/mcp/src/index.test.ts`

**Interfaces:**
- Produces: seven marketplace/provider MCP tools backed by the shared client.

- [ ] Write failing in-process MCP tests for discovery, retrieval, submission, review, bundle creation, and provider reads.
- [ ] Run focused MCP tests and confirm tools are missing.
- [ ] Register schemas, safe tool results, and handlers.
- [ ] Re-run MCP tests and build.
- [ ] Commit with `feat(mcp): expose marketplace procurement tools`.

### Task 9: Marketplace web experience

**Files:**
- Create: `apps/web/src/features/marketplace/catalog.ts`
- Create: `apps/web/src/features/marketplace/marketplace-grid.tsx`
- Create: `apps/web/src/features/marketplace/marketplace-grid.test.tsx`
- Create: `apps/web/src/features/marketplace/product-passport.tsx`
- Create: `apps/web/src/app/marketplace/page.tsx`
- Create: `apps/web/src/app/marketplace/[slug]/page.tsx`
- Modify: `apps/web/src/config/site.ts`
- Modify: `apps/web/src/components/site-header.test.tsx`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**
- Produces: searchable marketplace and product passport pages with example/live labels.

- [ ] Write failing component/navigation tests for product filtering, proof boundary, collateral, credentials, lineage, and evidence labels.
- [ ] Run focused web tests and confirm imports/routes are missing.
- [ ] Implement accessible responsive components and pages using explicit example seed data.
- [ ] Re-run web tests, lint, typecheck, and build.
- [ ] Commit with `feat(web): launch the verified data marketplace`.

### Task 10: Seller studio and provider profiles

**Files:**
- Create: `apps/web/src/features/marketplace/seller-studio.tsx`
- Create: `apps/web/src/features/marketplace/seller-studio.test.tsx`
- Create: `apps/web/src/features/marketplace/provider-profile.tsx`
- Create: `apps/web/src/app/sell/page.tsx`
- Create: `apps/web/src/app/providers/[id]/page.tsx`
- Modify: `apps/web/src/app/providers/page.tsx`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**
- Produces: human/agent listing workflow, publication gate preview, credential boundary copy, and objective provider metrics.

- [ ] Write failing tests for role selection, validation feedback, draft export, gate visibility, simulation/live metric separation, and no correctness claim from credentials.
- [ ] Run focused tests and confirm components are missing.
- [ ] Implement the studio and profiles without exposing credentials or claiming publication.
- [ ] Re-run web tests and build.
- [ ] Commit with `feat(web): add provider studio and verified profiles`.

### Task 11: Marketplace-originated purchase handoff

**Files:**
- Modify: `packages/contracts/src/request.ts`
- Modify: `packages/contracts/src/request.test.ts`
- Modify: `packages/core/src/service.ts`
- Modify: `packages/core/src/service.test.ts`
- Modify: `apps/web/src/features/demo/demo-console.tsx`
- Modify: `apps/web/src/features/demo/demo-console.test.tsx`

**Interfaces:**
- Produces: optional pinned `productId`, `productVersion`, and `providerId` order metadata validated against an active marketplace selection before execution.

- [ ] Write failing tests showing product version binding and rejection of inactive or mismatched products.
- [ ] Run contract/core/web tests and confirm missing behavior.
- [ ] Add a marketplace selection object without changing legacy requests.
- [ ] Re-run all affected tests.
- [ ] Commit with `feat(core): bind purchases to marketplace terms`.

### Task 12: Optional integration ports and documentation

**Files:**
- Create: `packages/integrations/src/marketplace-audit.ts`
- Create: `packages/integrations/src/marketplace-audit.test.ts`
- Modify: `packages/integrations/src/index.ts`
- Modify: `.env.example`
- Create: `docs/marketplace.md`
- Modify: `docs/agent-interfaces.md`
- Modify: `docs/architecture/trust-model.md`
- Modify: `docs/sponsor-requirements/qualification-matrix.md`
- Modify: `README.md`
- Modify: `scripts/check-agent-docs.mjs`

**Interfaces:**
- Produces: credential verifier and audit-anchor ports, deterministic local digest adapter, environment contract for future HCS/IPFS/zkTLS/Privy adapters, and executable documentation.

- [ ] Write failing tests for canonical manifest digests, secret rejection, and disabled network adapter status.
- [ ] Run integration tests and confirm missing interfaces.
- [ ] Implement the ports and local digest adapter; document exact trust and sponsor boundaries.
- [ ] Update executable documentation checks and run them.
- [ ] Commit with `docs: document marketplace integration boundaries`.

### Task 13: End-to-end verification

**Files:**
- Create: `scripts/e2e-marketplace.mjs`
- Modify: `package.json`
- Modify: `scripts/check-agent-docs.mjs`

**Interfaces:**
- Consumes: built contracts, core, SDK, API, CLI, and MCP packages.
- Produces: one credential-free test that submits, approves, discovers, bundles, purchases in simulation, records outcome, and reads provider metrics across interfaces.

- [ ] Write the end-to-end script against the intended public APIs and confirm it fails before wiring is complete.
- [ ] Add `market:e2e` and include it in `verify`.
- [ ] Run `pnpm verify`, inspect every failure, and fix causes with regression tests.
- [ ] Run a production web build and the marketplace script from a clean temporary store.
- [ ] Commit with `test: verify marketplace end to end`.

