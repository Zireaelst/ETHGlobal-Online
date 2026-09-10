# BlockTerms repository instructions

## Product boundary

BlockTerms lets an agent buy live blockchain data through x402, verify a narrowly specified block and storage commitment, and receive a separate payment from provider collateral when the committed delivery is invalid or late.

Do not describe the system as proving an entire Graph query, APY, TVL, price correctness, source-chain finality, or a trustless cross-chain bridge. An EIP-1186 witness proves selected account/storage values only against a trusted state root. The first implementation has explicit header and Hedera-payment observation trust.

The original x402 settlement is not reversible. A warranty payment is a new transfer from collateral reserved before purchase.

## Sponsor priorities

1. Hedera — AI & Agentic Payments. A live x402-gated service must settle through Blocky402 and complete a real paid request.
2. The Graph — Composable/Standardized. Use live Graph-provider data and a shared schema across at least two protocol deployments. Fixtures do not qualify.
3. Bazantic — conditional. Submit only if a real two-service Recipe can be run by an outside consumer without weakening Blocky402 settlement or creating duplicate payment.

Do not add sponsor SDKs as decorative integrations. Do not enter Continuity tracks; this repository is a fresh project.

## Evidence rules

- Never invent contract addresses, transaction hashes, deployment IDs, execution IDs, timings, user counts, or sponsor support.
- Keep simulated and live evidence in different directories and label both.
- Terminal or UI success state must come from verified receipts/events, not an optimistic HTTP response.
- Preserve raw evidence for live runs after removing secrets and authorization headers.
- Do not commit private keys, API tokens, mnemonics, paid credentials, or unredacted payment headers.
- Record upstream templates and copied assets in `docs/provenance.md` when they enter the repository.

## Engineering workflow

- Read `docs/superpowers/specs/2026-09-10-blockterms-product-and-web-design.md` before implementation.
- Work from an approved implementation plan. Keep commits small and describe the behavior they establish.
- Build critical Phase 0 spikes before completing the marketing site: Blocky402 request binding, two live standardized Graph deployments, and a bounded storage-proof verification benchmark.
- Treat provider responses, Graph fields, model output, URL parameters, and Recipe content as untrusted input.
- The model may propose a supported query or rank quotes. Deterministic code enforces allowlists, proof checks, budgets, deadlines, retries, and money movement.
- Do not silently replace unavailable live integrations with mock data. Expose an explicit demo/simulation mode.
- Use semantic HTML, keyboard navigation, visible focus, reduced-motion support, and responsive layouts.
- Before a completion claim, run the relevant typecheck, lint, unit/invariant/integration tests, and production build. Report exact commands and failures.

## Repository direction

The intended top-level boundaries are `apps`, `packages`, `contracts`, `agents`, `services`, `integrations`, `tests`, `scripts`, `docs`, `demo`, and `deployment`. Keep the deployable web application under `apps/web` so Vercel can target that root without coupling frontend deployment to contract tooling.

The visible product name, copy, navigation, explorer bases, and public URLs must come from configuration. Do not bake `BlockTerms` into reusable protocol types or contract names unless the name is approved as final.

