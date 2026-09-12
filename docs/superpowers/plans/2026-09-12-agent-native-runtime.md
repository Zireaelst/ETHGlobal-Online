# Agent-Native Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one durable BlockTerms runtime exposed through a TypeScript SDK, REST API, npx CLI, and MCP server, with real credential-gated integrations and an explicit end-to-end simulation mode.

**Architecture:** A contracts package defines all wire types. A core service persists orders and orchestrates adapter ports. Integration packages supply deterministic simulation and real Graph, EVM JSON-RPC, and Hedera x402 implementations. Thin SDK, HTTP, CLI, and MCP transports call the same methods.

**Tech Stack:** Node.js 22, TypeScript, Zod 4, Vitest, official x402 2.25 packages, official MCP TypeScript packages 2.0, Commander, tsup, pnpm workspaces.

## Global Constraints

- Preserve original-payment and warranty-receipt separation.
- Never silently fall back after a live execution starts.
- Never persist secrets or authorization headers.
- Simulation evidence must remain explicitly labeled and contain no fake transaction hash.
- Every new behavior follows red-green-refactor and lands in a focused commit.

---

### Task 1: Public contracts

**Files:** Create `packages/contracts/src/*.ts`, tests, package metadata, and tsconfig.

**Interfaces:** Produces `SubmitRequest`, `OrderRecord`, `ExecutionResult`, domain error schemas, parsing helpers, and JSON-safe metadata validation.

- [ ] Write tests for valid simulation/live/auto requests, pinned-block equality, bounded slots, policy limits, and metadata size.
- [ ] Run the contracts test and confirm failures because parsers do not exist.
- [ ] Implement schemas and exported inferred types.
- [ ] Run package tests and typecheck.
- [ ] Commit `feat(contracts): define the agent runtime API`.

### Task 2: Durable repository

**Files:** Create `packages/core/src/store.ts`, `store.test.ts`, and core package configuration.

**Interfaces:** Produces `OrderRepository` and `JsonFileOrderRepository` with `create`, `get`, `list`, and compare-and-set `update`.

- [ ] Write tests for restart persistence, missing records, corrupt files, and serialized concurrent writes.
- [ ] Confirm the tests fail because the repository is missing.
- [ ] Implement directory creation, atomic temporary-file rename, schema validation, and per-instance update serialization.
- [ ] Run tests and typecheck.
- [ ] Commit `feat(core): persist orders atomically`.

### Task 3: Runtime ports and mode selection

**Files:** Create `packages/core/src/ports.ts`, `config.ts`, tests, and exports.

**Interfaces:** Produces Graph, witness, and payment adapter contracts plus `resolveExecutionMode(requested, config)`.

- [ ] Write mode-selection tests for complete live configuration, explicit live missing variables, and auto simulation reasons.
- [ ] Verify expected failures.
- [ ] Implement adapter contracts and secret-safe configuration inspection.
- [ ] Run core tests.
- [ ] Commit `feat(core): select explicit live and simulation modes`.

### Task 4: Simulation adapters

**Files:** Create `packages/integrations/src/simulation.ts` and tests.

**Interfaces:** Produces deterministic adapters implementing all three core ports with `sim_` identifiers and standardized two-deployment data.

- [ ] Write adapter tests for deterministic output, requested block binding, bounded slots, and absence of transaction/explorer claims.
- [ ] Verify tests fail.
- [ ] Implement the minimal adapters.
- [ ] Run tests and evidence scan.
- [ ] Commit `feat(integrations): add deterministic simulation adapters`.

### Task 5: Real Graph adapter

**Files:** Create `packages/integrations/src/graph.ts` and tests using local HTTP GraphQL fixtures.

**Interfaces:** Produces `GraphStandardizedAdapter.fetch(request)`.

- [ ] Write tests for two endpoints, authorization redaction, same-block requests, incompatible schema versions, GraphQL errors, timeouts, and response bounds.
- [ ] Verify failures.
- [ ] Reuse and generalize the validated spike parser and query.
- [ ] Run integration tests.
- [ ] Commit `feat(integrations): query standardized Graph deployments`.

### Task 6: Real EVM witness adapter

**Files:** Create `packages/integrations/src/witness.ts` and tests using a local JSON-RPC fixture.

**Interfaces:** Produces `EvmWitnessAdapter.fetch(request)` with sanitized witness measurements.

- [ ] Write tests for pinned headers, account match, exact slot set, malformed proof nodes, RPC errors, and timeouts.
- [ ] Verify failures.
- [ ] Reuse and generalize the bounded storage spike.
- [ ] Run integration tests.
- [ ] Commit `feat(integrations): fetch bounded EVM witnesses`.

### Task 7: Hedera x402 adapter

**Files:** Create `packages/integrations/src/payment.ts`, policy selector, and tests with a local 402 resource fixture.

**Interfaces:** Produces `HederaX402Adapter.pay(request)` and `selectPaymentRequirement`.

- [ ] Write tests rejecting non-Hedera, non-exact, over-budget, unexpected payee/asset, missing settlement header, and non-2xx retry responses.
- [ ] Verify failures.
- [ ] Register `ExactHederaScheme` with the official x402 client and wrap fetch; read account/key only during construction.
- [ ] Decode and sanitize the payment response into a receipt identifier and network/amount metadata.
- [ ] Run adapter tests; keep funded-network test opt-in.
- [ ] Commit `feat(integrations): execute policy-bound Hedera x402 payments`.

### Task 8: Orchestration service

**Files:** Create `packages/core/src/service.ts`, verification helpers, and tests.

**Interfaces:** Produces `BlockTermsService` methods matching the design SDK contract.

- [ ] Write a full simulation lifecycle test from submit through terminal result.
- [ ] Write tests for live configuration-required, concurrent run conflict, upstream failure, status/result semantics, and payment/warranty receipt separation.
- [ ] Confirm failures.
- [ ] Implement state transitions and sanitized event persistence around injected adapters.
- [ ] Run core and integration tests.
- [ ] Commit `feat(core): orchestrate verifiable data orders`.

### Task 9: TypeScript SDK

**Files:** Create `packages/sdk/src/client.ts`, transports, package metadata, build configuration, and contract tests.

**Interfaces:** Produces `BlockTermsClient`, `createLocalClient`, and `createHttpClient`.

- [ ] Write a shared client contract suite and run it against the local transport first.
- [ ] Confirm failure.
- [ ] Implement client methods and local runtime factory.
- [ ] Add HTTP transport error decoding and abort timeout behavior.
- [ ] Run SDK tests, typecheck, and package build.
- [ ] Commit `feat(sdk): expose the BlockTerms client`.

### Task 10: HTTP service

**Files:** Create `services/api/src/server.ts`, router, auth/body helpers, tests, and package metadata.

**Interfaces:** Produces `createApiServer` and executable `blockterms-api`.

- [ ] Write real loopback HTTP tests for every `/v1` endpoint, body limits, malformed JSON, bearer auth, method handling, and graceful close.
- [ ] Confirm failures.
- [ ] Implement the Node HTTP server and stable error mapping.
- [ ] Run API and SDK HTTP contract tests.
- [ ] Commit `feat(api): serve the agent runtime over HTTP`.

### Task 11: npx CLI

**Files:** Create `apps/cli/src/index.ts`, command helpers, fixtures, spawn tests, package metadata, and build config.

**Interfaces:** Produces the `blockterms` executable.

- [ ] Write spawn tests for `example`, `submit --run`, `status`, `result`, invalid JSON, missing order, and clean JSON stdout.
- [ ] Confirm failures against the built executable target.
- [ ] Implement Commander commands using SDK methods and stable exit codes.
- [ ] Build then run CLI tests against a temporary store.
- [ ] Commit `feat(cli): add the BlockTerms npx interface`.

### Task 12: MCP server

**Files:** Create `apps/mcp/src/server.ts`, stdio entry, MCP client tests, package metadata, and build config.

**Interfaces:** Produces `createBlockTermsMcpServer` and the `blockterms-mcp` executable.

- [ ] Write an official MCP client test that spawns stdio, lists all seven tools, submits/runs simulation, and retrieves the result.
- [ ] Confirm failure.
- [ ] Register Zod-validated tools with structured content and correct annotations.
- [ ] Serve with `serveStdio` and keep logs on stderr.
- [ ] Run MCP tests and build.
- [ ] Commit `feat(mcp): expose BlockTerms tools over stdio`.

### Task 13: End-to-end scripts and examples

**Files:** Create `examples/sdk`, `examples/requests`, `scripts/e2e-agent-interfaces.mjs`, and root scripts.

**Interfaces:** Produces reproducible local workflows for SDK, HTTP, CLI, and MCP.

- [ ] Write an end-to-end script that creates a temporary store, exercises each interface, restarts the API, and checks persisted equality.
- [ ] Confirm it fails before wiring root commands.
- [ ] Add package build ordering and root `agent:e2e`, `agent:serve`, `agent:cli`, and `agent:mcp` scripts.
- [ ] Run the end-to-end script.
- [ ] Commit `test: verify every agent interface end to end`.

### Task 14: Documentation and environment contract

**Files:** Update `README.md`, developer page, provenance, add `.env.example`, `docs/architecture/agent-runtime.md`, and MCP/CLI/SDK usage docs.

**Interfaces:** Documents exact install, build, simulation, live variables, API schemas, MCP host configuration, evidence locations, and remaining credential gates.

- [ ] Add copy checks ensuring docs contain executable commands and no secret-shaped values.
- [ ] Update web developer content to point to each interface.
- [ ] Record official x402 and MCP dependencies and versions in provenance.
- [ ] Run documentation checks and evidence scan.
- [ ] Commit `docs: document the agent-native runtime`.

### Task 15: Final verification

**Files:** Modify only files required by failures found during verification.

- [ ] Run `pnpm install --frozen-lockfile` from a clean dependency state.
- [ ] Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and every package build.
- [ ] Run `pnpm agent:e2e` and existing Playwright tests.
- [ ] Run live configuration preflight and confirm it lists only missing variable names.
- [ ] Run `git diff --check` and the evidence scanner.
- [ ] Update the PR with the new focused commits after every check passes.
