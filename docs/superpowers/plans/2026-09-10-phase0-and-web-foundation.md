# BlockTerms Phase 0 and Web Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the fresh workspace, prove the three critical external assumptions without spending funds, and ship a tested Vercel-ready BlockTerms website and explicitly simulated demo shell.

**Architecture:** A pnpm workspace contains the Next.js application and small typed packages. Protocol state is a pure package consumed by the frontend. Phase 0 probes are read-only scripts that inspect Blocky402, live Graph endpoints supplied by environment variables, and an Ethereum EIP-1186 RPC response; they save no credentials and cannot claim payment or proof qualification.

**Tech Stack:** Node.js 22.13.1, pnpm 10.12.1, Next.js 16.3.4, React 19.3.0, TypeScript 7.0.2, ESLint 10.10.0, Vitest 5.0.0, Testing Library 16.3.3, Playwright 1.63.0, Zod 4.6.1, plain CSS, Vercel monorepo deployment rooted at `apps/web`.

## Global Constraints

- The desktop landing above 900px is one viewport; mobile and product routes scroll normally.
- Use the supplied MotionSites visual language while removing Vesper branding, fake metrics and dead anchor navigation.
- Keep `BlockTerms` configurable; reusable protocol types do not include the working brand.
- Never represent fixtures, simulated payments, generated identifiers or read-only probes as live transaction evidence.
- The Graph qualification requires live provider data and a shared schema across two protocol deployments.
- Hedera qualification requires a later real paid request settled through Blocky402; this plan only verifies facilitator capability.
- An EIP-1186 result is not accepted until it is checked against an independently accepted state root in a later milestone.
- Do not add Bazantic implementation until the Hedera and Graph base flow works and the conditional gate is reviewed.
- Use test-first development for pure protocol logic and visible demo-state behavior.
- Commit after each task; do not push unless the owner explicitly requests it.

## Milestone split

This specification spans four independently reviewable systems. This plan implements Milestone 1 only:

1. **This plan — Phase 0 and web foundation:** workspace, read-only feasibility probes, design system, routes and simulated console.
2. **Payment and provider service plan:** real x402 resource server, buyer signer, Blocky402 settlement and order binding.
3. **Warranty contracts and proof plan:** checkpoint, receipt adapter, provider bond, delivery registry and bounded verifier.
4. **Live integration and submission plan:** two live standardized deployments, agent policy, Bazantic gate, evidence, Vercel production and video.

Milestone 2 must not begin until the owner supplies or creates a dedicated, minimally funded Hedera testnet payer account. Milestone 3 must not inherit browser-held keys.

---

### Task 1: Create the pnpm workspace and quality gate

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.gitignore`
- Create: `.editorconfig`
- Create: `.nvmrc`
- Create: `tsconfig.base.json`
- Create: `eslint.config.mjs`
- Create: `scripts/check-no-fake-evidence.mjs`
- Modify: `README.md`

**Interfaces:**
- Consumes: Node.js 22.13.1 and pnpm 10.12.1 available in the local environment.
- Produces: root scripts `lint`, `typecheck`, `test`, `build`, and `check:evidence`; workspace globs for applications, packages and Phase 0 probes.

- [ ] **Step 1: Add the evidence guard first**

Create `scripts/check-no-fake-evidence.mjs`:

```js
import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";

const roots = ["apps", "demo", "deployment"];
const forbidden = [
  /0x[a-fA-F0-9]{64}/g,
  /0\.0\.\d{4,}/g,
];
const allowedFiles = new Set(["demo/evidence/README.md"]);

async function filesUnder(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? filesUnder(path) : [path];
    }));
    return nested.flat();
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

const files = (await Promise.all(roots.map(filesUnder))).flat();
const violations = [];
for (const file of files) {
  if (allowedFiles.has(file) || ![".ts", ".tsx", ".json", ".md"].includes(extname(file))) continue;
  const source = await readFile(file, "utf8");
  for (const pattern of forbidden) {
    for (const match of source.matchAll(pattern)) violations.push(`${file}: ${match[0]}`);
  }
}
if (violations.length) {
  console.error(violations.join("\n"));
  process.exit(1);
}
console.log("No transaction-like placeholder evidence found.");
```

- [ ] **Step 2: Create the exact root configuration**

Create `package.json`:

```json
{
  "name": "blockterms-workspace",
  "private": true,
  "packageManager": "pnpm@10.12.1",
  "engines": { "node": ">=22.13.1" },
  "scripts": {
    "build": "pnpm --filter @blockterms/web build",
    "dev": "pnpm --filter @blockterms/web dev",
    "lint": "pnpm -r --if-present lint",
    "typecheck": "pnpm -r --if-present typecheck",
    "test": "pnpm -r --if-present test",
    "check:evidence": "node scripts/check-no-fake-evidence.mjs",
    "verify": "pnpm lint && pnpm typecheck && pnpm test && pnpm check:evidence && pnpm build"
  },
  "devDependencies": {
    "@types/node": "22.20.2",
    "eslint": "10.10.0",
    "typescript": "7.0.2"
  }
}
```

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "spikes/*"
```

Create `.nvmrc`:

```text
22.13.1
```

Create `.editorconfig`:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

Create `.gitignore`:

```gitignore
node_modules/
.next/
coverage/
test-results/
playwright-report/
.env
.env.*
!.env.example
.vercel/
dist/
out/
cache/
broadcast/
.DS_Store
.idea/
.vscode/
```

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true
  }
}
```

Create `eslint.config.mjs`:

```js
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([
    "**/node_modules/**",
    "**/.next/**",
    "**/coverage/**",
    "**/dist/**",
    "**/out/**",
    "**/cache/**",
    "**/broadcast/**",
    "**/test-results/**",
    "**/playwright-report/**"
  ])
]);
```

- [ ] **Step 3: Install and prove the empty workspace gate**

Run:

```bash
corepack enable
pnpm install
pnpm check:evidence
```

Expected: a root `pnpm-lock.yaml`; evidence guard prints `No transaction-like placeholder evidence found.`

- [ ] **Step 4: Update repository status documentation**

Change README status to state that the workspace foundation exists after this task, while application code and live evidence still do not. Add the official platform references:

- `https://nextjs.org/docs/app/getting-started/installation`
- `https://vercel.com/docs/monorepos`

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml .gitignore .editorconfig .nvmrc tsconfig.base.json eslint.config.mjs scripts/check-no-fake-evidence.mjs README.md
git commit -m "build: initialize BlockTerms workspace"
```

---

### Task 2: Define protocol states before UI components

**Files:**
- Create: `packages/protocol/package.json`
- Create: `packages/protocol/tsconfig.json`
- Create: `packages/protocol/src/order.ts`
- Create: `packages/protocol/src/order.test.ts`
- Create: `packages/protocol/src/index.ts`

**Interfaces:**
- Consumes: no runtime service.
- Produces: `OrderState`, `OrderEvent`, `reduceOrder(state, event): OrderState`, `isTerminal(state): boolean`, `evidenceAvailability(state): "none" | "payment" | "delivery" | "terminal"`.

- [ ] **Step 1: Write failing transition tests**

Create `packages/protocol/src/order.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { evidenceAvailability, isTerminal, reduceOrder, type OrderState } from "./order";

describe("reduceOrder", () => {
  const quoted: OrderState = { kind: "quoted", orderId: "demo-order", mode: "simulation" };

  it("requires reconciliation before an unpaid reservation expires", () => {
    const reserved = reduceOrder(quoted, { type: "reserve" });
    const pending = reduceOrder(reserved, { type: "submit-payment", paymentId: "sim-payment" });
    expect(() => reduceOrder(pending, { type: "expire-unpaid" })).toThrow("reconciliation");
    const reconciled = reduceOrder(pending, { type: "reconcile-unpaid" });
    expect(reduceOrder(reconciled, { type: "expire-unpaid" }).kind).toBe("unpaid-expired");
  });

  it("separates payment from warranty", () => {
    const reserved = reduceOrder(quoted, { type: "reserve" });
    const pending = reduceOrder(reserved, { type: "submit-payment", paymentId: "sim-payment" });
    const paid = reduceOrder(pending, { type: "observe-payment", receiptId: "sim-receipt" });
    expect(evidenceAvailability(paid)).toBe("payment");
    const warranted = reduceOrder(paid, { type: "finalize-invalid-delivery", reason: "wrong-block" });
    expect(warranted.kind).toBe("warranty-paid");
    expect(warranted.originalPaymentReceiptId).toBe("sim-receipt");
    expect(warranted.warrantyReceiptId).toBeUndefined();
  });

  it("does not allow a terminal order to transition", () => {
    const terminal: OrderState = { kind: "accepted", orderId: "demo-order", mode: "simulation", deliveryId: "sim-delivery" };
    expect(isTerminal(terminal)).toBe(true);
    expect(() => reduceOrder(terminal, { type: "reserve" })).toThrow("terminal");
  });
});
```

- [ ] **Step 2: Run the test and confirm the red state**

Run `pnpm --dir packages/protocol test`.

Expected: FAIL because the package and `order.ts` implementation do not exist.

- [ ] **Step 3: Create the package and minimal typed reducer**

Use this union in `packages/protocol/src/order.ts`:

```ts
export type EvidenceMode = "simulation" | "live";

type Base = { orderId: string; mode: EvidenceMode };
export type OrderState =
  | (Base & { kind: "quoted" })
  | (Base & { kind: "reserved" })
  | (Base & { kind: "payment-pending"; paymentId: string; reconciledUnpaid: boolean })
  | (Base & { kind: "paid"; originalPaymentReceiptId: string })
  | (Base & { kind: "accepted"; deliveryId: string })
  | (Base & { kind: "warranty-paid"; originalPaymentReceiptId: string; warrantyReceiptId?: string })
  | (Base & { kind: "unpaid-expired" });

export type OrderEvent =
  | { type: "reserve" }
  | { type: "submit-payment"; paymentId: string }
  | { type: "reconcile-unpaid" }
  | { type: "observe-payment"; receiptId: string }
  | { type: "accept-delivery"; deliveryId: string }
  | { type: "finalize-invalid-delivery"; reason: "wrong-block" | "wrong-field" | "invalid-proof" | "timeout" }
  | { type: "record-warranty-receipt"; receiptId: string }
  | { type: "expire-unpaid" };
```

Implement `reduceOrder` as an exhaustive switch that permits only the transitions in the approved state diagram. Every rejected path throws an error containing the current state and event. `expire-unpaid` from `payment-pending` must throw unless `reconciledUnpaid` is true. `finalize-invalid-delivery` carries the original receipt into `warranty-paid`; it must not rename it to refund receipt. `record-warranty-receipt` sets the separate warranty receipt.

Use `vitest run` for the package test script and emit declarations from `src/index.ts`.

- [ ] **Step 4: Verify behavior and types**

Run:

```bash
pnpm --dir packages/protocol test
pnpm --dir packages/protocol typecheck
```

Expected: three tests pass; TypeScript exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/protocol pnpm-lock.yaml
git commit -m "feat: define auditable order states"
```

---

### Task 3: Probe Blocky402 capability without paying

**Files:**
- Create: `spikes/blocky-capability/package.json`
- Create: `spikes/blocky-capability/tsconfig.json`
- Create: `spikes/blocky-capability/src/supported.ts`
- Create: `spikes/blocky-capability/src/supported.test.ts`
- Create: `spikes/blocky-capability/src/cli.ts`
- Create: `demo/evidence/README.md`
- Create: `demo/evidence/live/.gitkeep`
- Create: `demo/evidence/simulation/.gitkeep`
- Modify: `docs/sponsor-requirements/qualification-matrix.md`

**Interfaces:**
- Consumes: `GET https://api.testnet.blocky402.com/supported`.
- Produces: `findHederaTestnetCapability(value): HederaCapability`; sanitized JSON at a user-selected path only when `--output` is passed.

- [ ] **Step 1: Test the capability parser**

Create tests that assert:

```ts
expect(findHederaTestnetCapability({
  kinds: [{ scheme: "exact", network: "hedera:testnet", x402Version: 2, extra: { feePayer: "0.0.7162784" } }],
  signers: { "hedera:*": ["0.0.7162784"] }
})).toEqual({ scheme: "exact", network: "hedera:testnet", x402Version: 2, feePayer: "0.0.7162784" });
```

Add negative tests for missing `hedera:testnet`, `x402Version !== 2`, non-exact scheme, and missing fee payer. Fixture account identifiers remain in unit tests and are not transaction evidence.

- [ ] **Step 2: Run red**

Run `pnpm --dir spikes/blocky-capability test`.

Expected: FAIL because parser implementation is missing.

- [ ] **Step 3: Implement parser and read-only CLI**

Validate the response with Zod. The CLI fetches `/supported`, uses an eight-second `AbortSignal.timeout`, prints network/scheme/version/fee-payer, and explicitly prints `No payment was created or settled.` It must not import a wallet, accept a private key, call `/verify`, or call `/settle`.

`demo/evidence/README.md` must define `live` versus `simulation`, ban secrets, and state that a `/supported` snapshot is capability evidence rather than paid-request evidence.

- [ ] **Step 4: Run tests and the hosted capability probe**

Run:

```bash
pnpm --dir spikes/blocky-capability test
pnpm --dir spikes/blocky-capability probe
```

Expected: tests pass; live output advertises `hedera:testnet`, `exact`, x402 v2 and a fee payer, then states that no payment occurred. If the hosted service does not advertise those values, preserve the output and mark the Hedera gate blocked; do not substitute another facilitator.

- [ ] **Step 5: Record the dated result without checking a box**

Append the probe date, command, returned capability and source URL to the qualification matrix. Keep the real-paid-request requirement unchecked in prose because no transaction occurred.

- [ ] **Step 6: Commit**

```bash
git add spikes/blocky-capability demo/evidence docs/sponsor-requirements/qualification-matrix.md pnpm-lock.yaml
git commit -m "test: verify Blocky402 Hedera capability"
```

---

### Task 4: Validate two live standardized Graph sources

**Files:**
- Create: `spikes/graph-standardized/package.json`
- Create: `spikes/graph-standardized/tsconfig.json`
- Create: `spikes/graph-standardized/.env.example`
- Create: `spikes/graph-standardized/src/schema.ts`
- Create: `spikes/graph-standardized/src/schema.test.ts`
- Create: `spikes/graph-standardized/src/query.ts`
- Create: `spikes/graph-standardized/src/cli.ts`
- Create: `spikes/graph-standardized/README.md`
- Modify: `docs/sponsor-requirements/qualification-matrix.md`

**Interfaces:**
- Consumes: `GRAPH_ENDPOINT_A`, `GRAPH_ENDPOINT_B`, optional server-only authorization header, and a common block number selected after both endpoints report indexed availability.
- Produces: `StandardizedProtocolSnapshot` containing deployment label, protocol name, schema/subgraph/methodology versions, network, block number/hash metadata, pool IDs and raw integer reserve fields.

- [ ] **Step 1: Write schema compatibility tests**

Define and test this minimum normalized type:

```ts
export type StandardizedProtocolSnapshot = {
  source: "graph";
  deploymentLabel: string;
  protocol: {
    id: string;
    name: string;
    network: string;
    schemaVersion: string;
    subgraphVersion: string;
    methodologyVersion: string;
  };
  block: { number: number; hash?: string };
  pools: Array<{
    id: string;
    inputTokenIds: string[];
    inputTokenBalances: string[];
  }>;
};
```

Test that missing any of the three version fields, mismatched balance/token array lengths, decimal/scientific reserve strings, or a response from a different requested block fails validation.

- [ ] **Step 2: Run red**

Run `pnpm --dir spikes/graph-standardized test`.

Expected: FAIL because schema/query implementation is absent.

- [ ] **Step 3: Implement one query pattern and two-endpoint CLI**

Use one GraphQL document for both endpoints. Request protocol version fields, `_meta.block.number`, `_meta.block.hash` when supported, and a small pool set at an explicit block. Preserve the raw query and sanitized response in memory for evidence export; do not log API keys. Do not derive APY or USD TVL.

The CLI must fail unless both endpoints:

- respond from live HTTP endpoints;
- expose the same required field names;
- report compatible schema versions;
- return data for the selected block;
- identify two distinct protocol deployments.

The `.env.example` contains variable names and example labels only, no endpoint secret or invented deployment ID.

- [ ] **Step 4: Run unit tests**

Run:

```bash
pnpm --dir spikes/graph-standardized test
pnpm --dir spikes/graph-standardized typecheck
```

Expected: parser/query tests pass and TypeScript exits 0.

- [ ] **Step 5: Run the live gate after the owner supplies endpoints**

Run `pnpm --dir spikes/graph-standardized probe` with server-side environment variables.

Expected: two distinct protocol labels, one explicit common block and all three version fields. If compatible live deployments cannot be found, preserve the failure reason and reopen the G-C product choice; do not use static JSON as qualification.

- [ ] **Step 6: Commit code separately from any sanitized live evidence**

```bash
git add spikes/graph-standardized docs/sponsor-requirements/qualification-matrix.md pnpm-lock.yaml
git commit -m "test: add standardized Graph compatibility probe"
```

---

### Task 5: Bound the EIP-1186 witness experiment

**Files:**
- Create: `spikes/storage-witness/package.json`
- Create: `spikes/storage-witness/tsconfig.json`
- Create: `spikes/storage-witness/.env.example`
- Create: `spikes/storage-witness/src/request.ts`
- Create: `spikes/storage-witness/src/request.test.ts`
- Create: `spikes/storage-witness/src/measure.ts`
- Create: `spikes/storage-witness/src/cli.ts`
- Create: `spikes/storage-witness/README.md`
- Modify: `docs/architecture/trust-model.md`

**Interfaces:**
- Consumes: `SOURCE_RPC_URL`, an explicitly approved pool address, explicit block number, and at most three documented storage slots.
- Produces: a normalized EIP-1186 response measurement with account-proof bytes, storage-proof bytes, slot count, block number and code hash. It does not produce a verified Hedera proof yet.

- [ ] **Step 1: Test bounded request construction**

Tests must demonstrate:

```ts
expect(buildGetProofRequest("0x0000000000000000000000000000000000000001", ["0x0"], "0x10")).toEqual({
  jsonrpc: "2.0",
  id: 1,
  method: "eth_getProof",
  params: ["0x0000000000000000000000000000000000000001", ["0x0"], "0x10"]
});
```

Reject zero slots, more than three slots, non-checksummable addresses, non-quantity block values, `latest`, `safe`, `finalized`, and duplicate slots. The probe must pin a numeric block.

- [ ] **Step 2: Run red, implement and rerun**

Run `pnpm --dir spikes/storage-witness test`, implement the JSON-RPC request builder and byte measurement, then rerun tests.

Expected: initial FAIL followed by all tests passing.

- [ ] **Step 3: Implement read-only RPC probe**

The CLI reads the pool, block and slots from explicit command arguments; reads only the RPC URL from environment; uses an eight-second timeout; validates account/storage proof arrays; fetches the same block header; and reports serialized byte sizes. It prints:

`Witness fetched but not accepted: no independent checkpoint or Hedera verifier was used.`

- [ ] **Step 4: Run against an owner-approved known-layout pool**

Run the documented CLI command with a pool whose code hash and storage layout have been independently recorded in the spike README.

Expected: one account proof, one-to-three storage proofs, a numeric block and measured bytes. If `eth_getProof` is unsupported, record the provider limitation and try an owner-approved second RPC; do not infer values from Graph output.

- [ ] **Step 5: Commit**

```bash
git add spikes/storage-witness docs/architecture/trust-model.md pnpm-lock.yaml
git commit -m "test: bound source-chain storage witnesses"
```

---

### Task 6: Build the configurable design system and app shell

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/button.tsx`
- Create: `packages/ui/src/status.tsx`
- Create: `packages/ui/src/index.ts`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/eslint.config.mjs`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/globals.css`
- Create: `apps/web/src/config/site.ts`
- Create: `apps/web/src/components/site-header.tsx`
- Create: `apps/web/src/components/site-header.test.tsx`
- Create: `apps/web/src/components/page-shell.tsx`

**Interfaces:**
- Consumes: `@blockterms/protocol` and `@blockterms/ui` workspace packages.
- Produces: `siteConfig`, `SiteHeader`, `PageShell`, `Button`, `StatusBadge`; all later routes use these instead of duplicating markup.

- [ ] **Step 1: Create a failing header behavior test**

Test that the header renders exactly four route links and `/demo`, opens the mobile menu, closes on Escape, restores focus to the toggle, and marks `aria-expanded` correctly. Mock the viewport with `matchMedia` rather than testing CSS pixels in jsdom.

- [ ] **Step 2: Run red**

Run `pnpm --dir apps/web test -- site-header.test.tsx`.

Expected: FAIL because the web package and component do not exist.

- [ ] **Step 3: Create exact package manifests and configs**

Create `apps/web/package.json` with these exact dependencies and scripts:

```json
{
  "name": "@blockterms/web",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "e2e": "playwright test"
  },
  "dependencies": {
    "@blockterms/protocol": "workspace:*",
    "@blockterms/ui": "workspace:*",
    "next": "16.3.4",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "zod": "4.6.1"
  },
  "devDependencies": {
    "@playwright/test": "1.63.0",
    "@testing-library/jest-dom": "7.0.1",
    "@testing-library/react": "16.3.3",
    "@types/node": "22.20.2",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "eslint": "10.10.0",
    "eslint-config-next": "16.3.4",
    "jsdom": "30.0.1",
    "typescript": "7.0.2",
    "vitest": "5.0.0"
  }
}
```

Create `packages/ui/package.json` and `packages/protocol/package.json` with unique workspace names, `private: true`, `type: "module"`, exports from `src/index.ts`, and `test`, `lint`, and `typecheck` scripts only where the package owns those checks. Declare React peer dependencies in `@blockterms/ui`; do not install a second React copy.

Do not enable static export: the later product uses server routes. `next.config.ts` uses `transpilePackages: ["@blockterms/ui", "@blockterms/protocol"]`.

- [ ] **Step 4: Implement configuration and shared components**

`apps/web/src/config/site.ts` exports a frozen object with:

```ts
export const siteConfig = Object.freeze({
  name: "BlockTerms",
  title: "BlockTerms — Verifiable Agent Data Infrastructure",
  description: "Buy live blockchain data through x402, verify its promised state, and recover value from provider collateral when delivery breaks its terms.",
  nav: [
    { label: "How It Works", href: "/how-it-works" },
    { label: "Proofs", href: "/proofs" },
    { label: "Providers", href: "/providers" },
    { label: "Docs", href: "/docs" }
  ],
  demoHref: "/demo"
});
```

The first rule in `globals.css` is exactly `html, body { background: #000000 !important; color: #ffffff; }`. Then add the approved tokens, reset, font stacks, focus state, reduced-motion override, liquid primary/ghost buttons, header and page-shell primitives. Do not add Tailwind.

- [ ] **Step 5: Verify header and package gates**

Run:

```bash
pnpm install
pnpm --dir apps/web test -- site-header.test.tsx
pnpm --dir apps/web typecheck
pnpm --dir apps/web lint
```

Expected: header tests pass; typecheck and lint exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web packages/ui package.json pnpm-lock.yaml
git commit -m "feat: add configurable web application shell"
```

---

### Task 7: Implement the landing and product routes

**Files:**
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/how-it-works/page.tsx`
- Create: `apps/web/src/app/proofs/page.tsx`
- Create: `apps/web/src/app/providers/page.tsx`
- Create: `apps/web/src/app/docs/page.tsx`
- Create: `apps/web/src/components/landing/hero.tsx`
- Create: `apps/web/src/components/landing/capability-row.tsx`
- Create: `apps/web/src/components/landing/entrance-controller.tsx`
- Create: `apps/web/src/components/landing/hero.test.tsx`
- Create: `apps/web/src/components/proof-scope.tsx`
- Modify: `apps/web/src/app/globals.css`
- Modify: `docs/provenance.md`

**Interfaces:**
- Consumes: site config and shared UI from Task 6.
- Produces: all marketing/documentation routes except `/demo`; `ProofScope` reusable by the demo.

- [ ] **Step 1: Write content-integrity tests**

Test the hero for exact approved headline, lede, two real route CTAs, three capability statements, no numeric adoption metric, no Vesper copy, and no `#pricing`/dead anchors. Test `ProofScope` contains selected-field/state-root language and the explicit exclusions: full-query completeness, APY, TVL and financial safety.

- [ ] **Step 2: Run red**

Run `pnpm --dir apps/web test -- hero.test.tsx`.

Expected: FAIL because landing components are absent.

- [ ] **Step 3: Implement the single-viewport landing**

Follow `docs/prompts/motionsites-blockterms.md`. Use the provided video URL in one configuration constant and record it in provenance. Render a black fallback when video fails. Use inline SVG for the original BlockTerms mark and capability icons; do not copy Vesper's exact logo mark.

Desktop CSS above 900px locks the landing page only to `100dvh`; the shared layout and other routes remain scrollable. Short-height breakpoints preserve header, hero and capability row. The hero video is decorative, muted, autoplay, loop and `playsInline`.

Implement the animation controller as a small client component: every appearing element becomes permanently visible on its own `animationend`; after two animation frames, force visibility if no animation is running. Reduced-motion CSS disables transitions and forces visibility.

- [ ] **Step 4: Implement four substantive product routes**

Use the content requirements in the approved spec. Each route must have a specific page title, one-sentence orientation, relevant state/sequence content and link into `/demo`. `Proofs` includes `ProofScope`; `How It Works` distinguishes payment and warranty; `Providers` explains locked liabilities; `Docs` links to the public repository documents without exposing local filesystem paths.

- [ ] **Step 5: Verify content, accessibility primitives and build**

Run:

```bash
pnpm --dir apps/web test
pnpm --dir apps/web lint
pnpm --dir apps/web typecheck
pnpm --dir apps/web build
pnpm check:evidence
```

Expected: all tests and checks pass; Next produces all five routes; evidence guard finds no transaction-like placeholders.

- [ ] **Step 6: Commit**

```bash
git add apps/web docs/provenance.md
git commit -m "feat: build BlockTerms marketing experience"
```

---

### Task 8: Build an honest simulated demo console

**Files:**
- Create: `apps/web/src/app/demo/page.tsx`
- Create: `apps/web/src/features/demo/demo-console.tsx`
- Create: `apps/web/src/features/demo/demo-console.test.tsx`
- Create: `apps/web/src/features/demo/scenarios.ts`
- Create: `apps/web/src/features/demo/order-timeline.tsx`
- Create: `apps/web/src/features/demo/evidence-panel.tsx`
- Create: `apps/web/src/features/demo/human-approval.tsx`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**
- Consumes: `reduceOrder`, `OrderState`, shared `StatusBadge`, `ProofScope`.
- Produces: a browser-only educational simulator whose mode is always `simulation`; later live adapters can provide the same `OrderState` union.

- [ ] **Step 1: Test simulation honesty and money separation**

Tests must assert:

- `Simulation` remains visible in every scenario and viewport;
- transaction and explorer links are absent;
- payment receipt and warranty receipt use different labels;
- the invalid-delivery scenario does not say the original payment was reversed;
- budget overflow opens human approval and cannot advance automatically;
- a pending settlement cannot be retried before reconciliation;
- proof exclusions remain visible from the evidence panel.

- [ ] **Step 2: Run red**

Run `pnpm --dir apps/web test -- demo-console.test.tsx`.

Expected: FAIL because the demo feature is absent.

- [ ] **Step 3: Implement three deterministic scenarios**

Create static, non-transaction-like identifiers such as `demo-order-a` and these scenarios:

1. valid delivery: quoted → reserved → pending → paid → accepted;
2. invalid proof: quoted → reserved → pending → paid → warranty state without a live warranty receipt;
3. over budget: quote comparison → required human approval, no payment transition.

Render the state machine timeline, quote factors, exact proof scope and educational evidence panel. Do not use random numbers, generated hexadecimal strings, fake provider counts or fake latency.

- [ ] **Step 4: Verify the console and production build**

Run:

```bash
pnpm --dir apps/web test -- demo-console.test.tsx
pnpm check:evidence
pnpm verify
```

Expected: demo tests pass, no fake evidence is detected, and the full workspace verification exits 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat: add transparent BlockTerms simulator"
```

---

### Task 9: Add browser verification and Vercel readiness

**Files:**
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/e2e/navigation.spec.ts`
- Create: `apps/web/e2e/landing-viewport.spec.ts`
- Create: `apps/web/e2e/demo-honesty.spec.ts`
- Create: `vercel.json`
- Modify: `package.json`
- Modify: `docs/deployment/vercel.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: completed web routes and workspace scripts.
- Produces: `pnpm e2e`; documented Vercel root-directory configuration and a deployable preview build. It does not create a production deployment.

- [ ] **Step 1: Write failing browser checks**

Add Playwright checks for:

- all header routes returning successful pages;
- desktop landing at 1440×900 having no vertical scrollbar;
- mobile 390×844 allowing scroll and opening/closing the menu with keyboard Escape;
- `/demo` always showing `Simulation` and no explorer link;
- reduced-motion context leaving hero content visible;
- direct navigation and refresh on every route.

- [ ] **Step 2: Run red**

Run `pnpm --dir apps/web e2e`.

Expected: FAIL before Playwright configuration/browser installation is complete.

- [ ] **Step 3: Configure Playwright and Vercel metadata**

Use Playwright 1.63.0 with Chromium, `webServer.command: "pnpm dev"`, base URL `http://127.0.0.1:3000`, trace on first retry and no screenshot/video on successful tests.

Create root `vercel.json` only for shared safe headers; do not duplicate Vercel's framework build detection. Document Dashboard configuration: import the GitHub repository, choose `apps/web` as Root Directory, use the detected Next.js build, and keep production secrets server-side. The official monorepo source is `https://vercel.com/docs/monorepos`.

- [ ] **Step 4: Run full local verification**

Run:

```bash
pnpm --dir apps/web exec playwright install chromium
pnpm verify
pnpm --dir apps/web e2e
git diff --check
```

Expected: workspace verification and all browser tests pass; no whitespace errors.

- [ ] **Step 5: Perform manual visual review**

Inspect 390×844, 900×900, 1440×900, 1920×1080 and 1440×700. Record issues and corrections in the commit diff. Confirm readable text over multiple video frames, keyboard focus, one-frame desktop composition, normal subpage scrolling and no white flash.

- [ ] **Step 6: Commit**

```bash
git add apps/web package.json pnpm-lock.yaml vercel.json docs/deployment/vercel.md README.md
git commit -m "test: verify Vercel-ready web experience"
```

## Milestone completion gate

Run these commands from the repository root:

```bash
pnpm verify
pnpm --dir apps/web e2e
pnpm --dir spikes/blocky-capability probe
git status --short
git log --oneline --decorate -10
```

Completion requires:

- clean unit, lint, type, evidence, build and browser checks;
- a read-only Blocky402 capability result that still advertises Hedera testnet x402 v2;
- documented Graph and EIP-1186 live-gate results or an explicit blocked status with captured reason;
- no secrets or fabricated evidence;
- a clean worktree and task-sized commits;
- owner review before any funded testnet payment or public Vercel production promotion.

## Next plan trigger

After this milestone, write `docs/superpowers/plans/2026-09-10-x402-provider-and-payment.md` using the observed Blocky402 wire format and current `@x402/hedera` types. That plan must test order/resource/payment binding, idempotent reconciliation and key custody before a real funded testnet request.
