# BlockTerms product and web design

Date: 2026-09-10  
Status: approved direction; written specification awaiting final review  
Deployment target: Vercel for the web application

## Objective

Build an independently understandable ETHGlobal product in which an agent purchases live blockchain data, verifies the delivery against explicit terms, and receives a warranty payment from pre-reserved provider collateral when a final delivery is objectively invalid or late.

The first public experience must explain this in under one minute and lead into a functioning buyer-agent demo. The marketing surface uses the supplied MotionSites/Vesper visual direction: black cinematic background, restrained monochrome typography, liquid-metal controls, bottom-centered hero, compact statistics, and deliberate entrance motion. Its brand, content, navigation, and product behavior are specific to BlockTerms.

## Users and jobs

The primary user is an agent or risk-infrastructure developer who needs live cross-protocol state without trusting an HTTP 200 response. The secondary user is a data provider who wants to sell a higher-assurance snapshot and place collateral behind a narrow service promise.

The buyer must be able to:

1. state a supported data need and maximum spend;
2. compare signed quotes by price, freshness, proof coverage, and reserved collateral;
3. authorize one bounded x402 purchase;
4. understand payment, delivery, verification, and warranty as distinct states;
5. inspect the exact scope of the proof and linked explorer evidence;
6. stop or request human approval when the next purchase exceeds policy.

The provider must be able to fund collateral, publish a signed quote, reserve collateral for a buyer/order, deliver a bounded public witness, and inspect active and terminal liabilities.

## Product scope

The first demonstrated asset is a same-chain, same-block snapshot for two DEX protocol deployments that expose a compatible standardized Graph schema. The exact deployments are selected only after Phase 0 confirms live access and field compatibility. The witness covers a small set of known-layout storage fields such as pool reserves and their contract code hash.

Included:

- live Graph-provider queries;
- signed quote and manifest formats;
- one real Blocky402-settled request on Hedera testnet;
- provider collateral reservation and separate warranty payment;
- bounded EIP-1186 account/storage witness validation;
- explicit state-root checkpoint trust;
- deterministic budget, retry, proof, and deadline policies;
- Vercel-hosted landing, documentation, and buyer demo UI.

Excluded from the first proof:

- full Graph-query completeness;
- APY, USD TVL, price quality, or investment-safety guarantees;
- autonomous trading with user funds;
- trustless Ethereum light client on Hedera;
- private data or TEE claims;
- a general agent marketplace;
- decorative identity, wallet, or DeFi integrations.

## Information architecture

### Landing `/`

The desktop landing is a single viewport. Its role is to make the purchase-to-proof-to-warranty loop legible, not to contain every technical detail. Mobile may scroll for accessibility and usable controls.

- Header: configurable wordmark, `How It Works`, `Proofs`, `Providers`, `Docs`, `Launch Demo`.
- Hero badge: `Verifiable Agent Data Infrastructure`.
- Headline: `Pay AI agents for data they can verify.` The words `data they can verify` use the contrasting italic serif treatment.
- Lede: `Purchase live blockchain data through x402. Verify its onchain claims. Recover value from provider collateral when delivery breaks its terms.`
- Actions: `Launch Demo` and `Inspect the Proof`.
- Three evidence-oriented statements: `Live standardized data`, `Machine-paid through x402`, `Warranty backed by collateral`. They are product capabilities, not fabricated adoption metrics.

The supplied background video may be referenced initially at its provided URL. Before the final public submission, provenance and permitted use must be recorded or the asset replaced with an owned equivalent. No CloudFront URL other than the one explicitly supplied may be invented.

### How It Works `/how-it-works`

Explain six steps with one running order: request, quote, collateral reservation, x402 payment, delivery verification, accept or warranty. Show normal, invalid-proof, timeout, and settlement-pending paths. Clearly distinguish the original payment from the warranty transfer.

### Proofs `/proofs`

Show a human-readable manifest and expandable raw artifacts. Explain what EIP-1186 proves, the trusted state-root/checkpoint boundary, codehash and storage-layout pinning, data availability, and what the proof does not establish. A source block and Hedera transaction can link to public explorers only when real identifiers exist.

### Providers `/providers`

Explain collateral funding, quote terms, reservation TTL, delivery deadline, final delivery, active liabilities, and withdrawal restrictions. Avoid marketplace/reputation claims in the first version. Provider admission is curated and disclosed.

### Demo `/demo`

The demo is an application console, not a marketing mockup. It exposes request scope, budget, quote comparison, human approval, payment pending, witness verification, warranty result, and evidence export. Until live integrations exist, an explicit `Simulation` badge is mandatory and transaction/explorer controls are disabled.

### Docs `/docs`

Start with a five-minute conceptual quickstart, then quote/manifest schemas, buyer SDK usage, provider setup, networks/deployments, evidence format, threat model, and sponsor qualification evidence. Secret values never appear in examples.

## Visual system

Use the supplied Vesper layout as a visual reference rather than preserving its product identity. Keep pure black page paint as the first style rule to prevent a white flash. Use Inter for UI and Instrument Serif italic only for the emphasized headline phrase. Preserve the monochrome metal/glass button language, subtle grain, full-bleed background motion, staggered entrance animation, reduced-motion fallback, mobile menu behavior, and responsive type scale.

Changes required for BlockTerms:

- wordmark and favicon become configurable and original;
- navigation points to real routes rather than missing anchor sections;
- all Vesper copy and fabricated adoption statistics are removed;
- CTA goes to `/demo`;
- hero background receives enough black scrim for WCAG-readable copy;
- every motion has a no-animation visible state;
- the wider product pages reuse tokens and components but are allowed to scroll;
- proof states use semantic status text in addition to color.

No WebGL, Three.js, Lottie, heavy charting library, pricing table, newsletter form, stock dashboard, floating crypto logos, or generic glowing-orb imagery.

## Application architecture

The repository will be a workspace with a deployable Next.js application at `apps/web`. Vercel targets that directory. Shared visual primitives live in `packages/ui`; product protocol types live in `packages/protocol`. Frontend server routes may aggregate public read data but never hold test-wallet private keys in browser bundles.

Suggested boundaries:

```text
apps/web                 marketing, docs and buyer/provider UI
packages/ui              tokens and accessible reusable components
packages/protocol        quote, manifest, receipt and state types
packages/standardized-query  Graph adapters and version checks
packages/proof-codec     bounded witness encoding/decoding
contracts                Hedera EVM contracts and Foundry tests
agents/buyer             planner and deterministic policy engine
services/provider-api    x402-gated data service
services/payment-observer Hedera settlement reconciliation
services/checkpoint-observer source-chain checkpoint observation
integrations             Blocky402, Graph, Hedera and Ethereum adapters
demo                     scripts and separated live/simulation evidence
deployment               network manifests and infrastructure configuration
```

Public frontend data moves through typed adapters. UI state follows the protocol state machine: `Quoted → Reserved → PaymentPending → Paid → Accepted | WarrantyPaid`; an unpaid reservation can expire only after settlement reconciliation. The UI cannot infer terminal success from a button click.

## Naming

`BlockTerms` is a working name. A single site configuration provides visible name, title, description, links, navigation, social metadata, explorer bases, and feature flags. Reusable protocol packages use domain names such as `Quote`, `DeliveryManifest`, and `WarrantyState`; they do not embed the working brand. A later rename therefore changes presentation and package metadata without changing signed-domain semantics accidentally.

## Error handling

- A Graph outage offers another live provider or remains unavailable; fixtures cannot masquerade as qualification evidence.
- `PaymentPending` reconciles the same order and payment identifier before allowing retry.
- A stale or wrong-chain block is rejected before downstream use.
- A malformed proof is shown as a scoped verification failure and cannot directly move funds unless it is the provider's bound final delivery.
- A quote expiry cannot release collateral while a bounded in-flight settlement is unresolved.
- An unavailable explorer never changes transaction state; the app retains receipt data.
- If the frontend loses connection, it resumes from persisted order/event state.
- Simulation mode is visually persistent and excluded from live evidence exports.

## Accessibility and performance

The landing must remain usable at keyboard-only navigation, 200% zoom, reduced motion, narrow mobile widths, and short desktop heights. Text retains sufficient contrast over every video frame. Video is muted, inline, decorative, and does not block first content paint. The page has a black poster/fallback and no white flash. Avoid runtime animation dependencies for the landing.

The initial Vercel production build must have deterministic environment validation, no secrets in client-exposed variables, cache rules appropriate to live status, and a health/status surface that distinguishes frontend availability from sponsor-service availability.

## Verification strategy

Frontend checks cover route rendering, navigation, mobile menu focus/escape behavior, reduced motion, demo state labels, and absence of fabricated identifiers. Visual review covers the supplied viewport breakpoints and short-height desktops. Protocol UI tests feed typed state fixtures but label them as test data.

System verification later includes a real paid request, two live Graph sources, a valid witness, a provider-bound invalid final witness, one warranty transfer, timeout reconciliation, receipt replay rejection, and budget escalation. Evidence is exported only from checked live runs.

## Release order

1. Preserve these documents as the initial commit.
2. Write and approve the implementation plan.
3. Run Phase 0 integration spikes before polishing all subpages.
4. Build the web design system and landing against typed states.
5. Connect the real minimum end-to-end path.
6. Add proof/provider/docs pages and final evidence handling.
7. Deploy a Vercel preview, verify it, then promote the reviewed release to production.

## Acceptance criteria

- A new visitor can explain payment versus warranty after viewing the hero and How It Works page.
- The desktop landing fits one viewport at the specified breakpoints; product subpages scroll normally.
- The demo never labels simulated data, payments, proofs, or receipts as live.
- The UI exposes proof scope and checkpoint trust without claiming full-query verification.
- The repo supports a Vercel deployment rooted at `apps/web` after implementation.
- The final sponsor evidence can map each requirement to a live URL, exact code reference, and real transaction or query artifact.

