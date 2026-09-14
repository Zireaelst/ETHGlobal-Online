# Product App and Agent Clients Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a flowing public landing site, a credible routed marketplace app, and a polished connection guide proving that humans, Claude Code, Codex/OpenAI-compatible clients, OpenCode, SDK, REST, CLI, and MCP can use BlockTerms.

**Architecture:** Keep marketing routes under the existing root layout and add a nested `/app` layout with its own product navigation. Reuse the current marketplace fixtures and verified runtime contracts, add a small browser simulation service for durable human orders, and document the already-tested Node CLI and stdio MCP binaries with client-specific connection recipes. Preserve all existing agent interfaces while adding lifecycle-oriented aliases only where they improve interoperability.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 7, Zod 4, Vitest/Testing Library, Commander, MCP TypeScript SDK 2.0, pnpm workspaces.

## Global Constraints

- Every simulation state and fixture is visibly labeled and cannot be confused with live payment or proof evidence.
- Existing Hedera x402, The Graph, proof, warranty, SDK, REST, CLI, and MCP behavior remains compatible.
- The app must work locally without credentials and must not silently fall back after a live execution starts.
- Browser code never claims to execute a local CLI or MCP process.
- All interactive controls are keyboard accessible, responsive, and respect reduced-motion preferences.
- Version, terms hash, provider, price, and product selection remain pinned through a simulated order lifecycle.

---

### Task 1: Marketing navigation and route contract

**Files:**
- Modify: `apps/web/src/config/site.ts`
- Modify: `apps/web/src/components/site-header.tsx`
- Modify: `apps/web/src/components/site-header.test.tsx`

**Interfaces:**
- Produces: marketing navigation with in-page Product and Use Cases links plus `/developers`, `/docs`, and `/app` actions.

- [ ] Write a failing header test that expects `Product`, `Use Cases`, `Developers`, `Docs`, and `Open App`, with no marketplace/provider/seller operations in the marketing nav.
- [ ] Run `pnpm --filter @blockterms/web test -- src/components/site-header.test.tsx` and confirm the missing labels or links fail.
- [ ] Update `siteConfig.nav`, rename the header CTA, and keep the mobile focus trap behavior.
- [ ] Re-run the focused test and `pnpm --filter @blockterms/web typecheck`.
- [ ] Commit `feat(web): separate marketing and product navigation`.

### Task 2: Product app shell

**Files:**
- Create: `apps/web/src/components/app-shell.tsx`
- Create: `apps/web/src/components/app-shell.test.tsx`
- Create: `apps/web/src/app/app/layout.tsx`
- Create: `apps/web/src/app/app/page.tsx`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**
- Produces: `AppShell({ children })` with Overview, Marketplace, Orders, Providers, Sell Data, and Agent Console navigation, a Simulation status badge, responsive mobile disclosure, and public-site return link.

- [ ] Write failing component tests for product navigation, active-route semantics, environment labeling, menu controls, and keyboard-visible labels.
- [ ] Run the focused test and confirm `AppShell` is missing.
- [ ] Implement the client shell and `/app` dashboard using catalog-derived counts and clearly labeled simulation activity.
- [ ] Re-run the focused test, web typecheck, and lint.
- [ ] Commit `feat(web): add the BlockTerms product shell`.

### Task 3: Flowing landing page

**Files:**
- Create: `apps/web/src/components/landing/product-story.tsx`
- Create: `apps/web/src/components/landing/product-story.test.tsx`
- Modify: `apps/web/src/components/landing/hero.tsx`
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**
- Produces: accessible landing sections with `id="product"` and `id="use-cases"`, marketplace preview, workflow, composable/private products, interface matrix, architecture, and final CTA.

- [ ] Write failing tests for all narrative sections, app/agent-console CTAs, simulation labels on catalog previews, and heading order.
- [ ] Run the focused test and confirm the story component is missing.
- [ ] Implement the sections from existing catalog fixtures and change the landing container from single-viewport overflow to a scrollable page.
- [ ] Re-run the landing tests at default and reduced-motion DOM settings, then web lint/typecheck.
- [ ] Commit `feat(web): turn the landing into a product story`.

### Task 4: Routed marketplace, providers, and seller workspace

**Files:**
- Create: `apps/web/src/app/app/marketplace/page.tsx`
- Create: `apps/web/src/app/app/marketplace/[slug]/page.tsx`
- Create: `apps/web/src/app/app/providers/page.tsx`
- Create: `apps/web/src/app/app/providers/[id]/page.tsx`
- Create: `apps/web/src/app/app/sell/page.tsx`
- Modify: `apps/web/src/features/marketplace/marketplace-grid.tsx`
- Modify: `apps/web/src/features/marketplace/product-passport.tsx`
- Modify: legacy pages under `apps/web/src/app/marketplace`, `providers`, `sell`, and `demo`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**
- Produces: app-native browsing and detail links plus permanent legacy redirects using `next/navigation.redirect`.

- [ ] Write failing tests that expect catalog links and product purchase links under `/app`, while preserving product filtering and passport evidence boundaries.
- [ ] Run marketplace component tests and confirm legacy paths fail expectations.
- [ ] Add app pages, update internal links, and replace legacy product pages with server redirects that retain dynamic slug/id values.
- [ ] Re-run marketplace and seller tests, then build the web app to verify every route is statically/server renderable.
- [ ] Commit `feat(web): move marketplace workflows into the app`.

### Task 5: Durable human quote and purchase flow

**Files:**
- Create: `apps/web/src/features/orders/order-store.ts`
- Create: `apps/web/src/features/orders/order-store.test.ts`
- Create: `apps/web/src/features/orders/purchase-flow.tsx`
- Create: `apps/web/src/features/orders/purchase-flow.test.tsx`
- Create: `apps/web/src/features/orders/order-detail.tsx`
- Create: `apps/web/src/app/app/orders/page.tsx`
- Create: `apps/web/src/app/app/orders/new/page.tsx`
- Create: `apps/web/src/app/app/orders/[id]/page.tsx`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**
- Produces: `SimulationOrder`, `createSimulationQuote`, `purchaseSimulationOrder`, `readSimulationOrders`, and browser components that preserve product/version/provider/terms metadata in local storage.

- [ ] Write failing store tests for deterministic validation, budget rejection, version/terms pinning, persistence, and repeat reads.
- [ ] Run the store test and confirm missing exports fail.
- [ ] Implement the pure order state functions and a browser-local repository adapter with an injected `Storage` interface.
- [ ] Write failing purchase-flow tests for quote review, explicit Simulation labeling, buy action, status timeline, result display, and missing-order recovery.
- [ ] Run the component tests and confirm the UI is missing.
- [ ] Implement the order list/new/detail routes and point each product passport purchase CTA at its pinned order form.
- [ ] Re-run order, marketplace, lint, and typecheck checks.
- [ ] Commit `feat(web): add a persistent human purchase flow`.

### Task 6: Agent connection and how-to-use page

**Files:**
- Create: `apps/web/src/features/connect/client-recipes.ts`
- Create: `apps/web/src/features/connect/connection-guide.tsx`
- Create: `apps/web/src/features/connect/connection-guide.test.tsx`
- Create: `apps/web/src/app/app/agent-console/page.tsx`
- Modify: `apps/web/src/app/developers/page.tsx`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**
- Produces: client recipe data and a polished page with Quick Start, Claude Code, Codex, OpenCode, CLI, TypeScript SDK, REST, and MCP sections; copy buttons; transport/status explanations; and verified smoke-test commands.

- [ ] Write failing tests for all client options, exact stdio command/arguments, `npx blockterms`, MCP tool names, copy controls, REST/SDK examples, and the distinction between browser REST execution and local MCP/CLI execution.
- [ ] Run the focused test and confirm the guide is missing.
- [ ] Implement reusable recipe data and accessible client tabs/steps without browser-terminal theater.
- [ ] Update `/developers` to summarize interfaces and link to `/app/agent-console` for complete setup.
- [ ] Re-run connect-page tests, web lint, typecheck, and build.
- [ ] Commit `feat(web): add the agent connection guide`.

### Task 7: CLI and MCP interoperability aliases

**Files:**
- Modify: `apps/cli/src/index.test.ts`
- Modify: `apps/cli/src/index.ts`
- Modify: `apps/mcp/src/server.ts`
- Modify: `apps/mcp/src/index.test.ts`
- Modify: `scripts/e2e-marketplace.mjs`

**Interfaces:**
- Produces: backwards-compatible CLI aliases `products list|get` and `orders status|result`, plus MCP lifecycle aliases `blockterms_list_products`, `blockterms_get_product`, `blockterms_get_order`, and `blockterms_get_result`; existing tool and command names remain available.

- [ ] Write failing CLI spawn tests for the new aliases using a temporary marketplace/order store and JSON stdout.
- [ ] Run `pnpm --filter blockterms test` and confirm Commander reports unknown commands.
- [ ] Add aliases by reusing the existing client calls rather than duplicating marketplace logic.
- [ ] Write failing MCP stdio expectations for lifecycle aliases and invoke one read alias through the official client.
- [ ] Run `pnpm --filter @blockterms/mcp test` and confirm the alias names are missing.
- [ ] Register alias tools with the same schemas, annotations, error mapping, and structured content as the existing tools.
- [ ] Extend marketplace e2e coverage and re-run CLI/MCP/e2e checks.
- [ ] Commit `feat(agent): add interoperable marketplace aliases`.

### Task 8: Connection documentation and end-to-end release verification

**Files:**
- Modify: `docs/agent-interfaces.md`
- Create: `docs/connect-agents.md`
- Modify: `README.md`
- Modify: `scripts/check-agent-docs.mjs`
- Modify: `docs/deployment/vercel.md`

**Interfaces:**
- Produces: copyable local build, API start, `npx` CLI, Claude Code `claude mcp add`, Codex TOML, OpenCode JSON, generic stdio JSON, SDK, REST, smoke-test, and troubleshooting instructions.

- [ ] Extend the documentation checker with required executable strings and client headings; run `pnpm check:agent-docs` and confirm it fails before docs are updated.
- [ ] Write the connection guide with environment-variable names only, expected tool discovery behavior, Windows-neutral command alternatives where needed, and explicit simulation/live boundaries.
- [ ] Update README and deployment docs with the new route map and local product startup sequence.
- [ ] Run focused web tests, CLI tests, MCP stdio tests, `pnpm market:e2e`, and `pnpm agent:e2e`.
- [ ] Run `pnpm verify`, `git diff --check`, and the evidence scanner; fix any discovered failures with a regression test before changing production code.
- [ ] Deploy the web app to Vercel production, check `/`, `/app`, `/app/marketplace`, one product, `/app/orders/new`, `/app/sell`, and `/app/agent-console`, then record only the real deployment URL and status.
- [ ] Commit `docs: explain how humans and agents use BlockTerms` and push the branch.

