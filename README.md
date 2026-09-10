# BlockTerms

BlockTerms is a fresh ETHOnline 2026 project for purchasing live blockchain data with explicit delivery terms.

An agent requests a narrowly scoped snapshot, compares signed provider quotes, reserves provider collateral, pays through Hedera x402 using Blocky402, and checks the returned state witness. A valid delivery is accepted. An invalid or late final delivery can trigger a separate warranty transfer from the provider's reserved collateral.

## Status

The web MVP, protocol state model, bounded integration probes, and evidence quality gate are implemented. The public experience is deployable to Vercel and the demo is explicitly simulation-only. Contracts, live payments, and transaction evidence remain outside this foundation release.

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
- [Vercel deployment approach](docs/deployment/vercel.md)
- [MotionSites adaptation prompt](docs/prompts/motionsites-blockterms.md)
- [Orca/Codex session prompt](docs/prompts/orca-codex-session.md)
- [Phase 0 and web foundation implementation plan](docs/superpowers/plans/2026-09-10-phase0-and-web-foundation.md)

## Platform references

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Vercel monorepos](https://vercel.com/docs/monorepos)

## Core claim

> BlockTerms binds a paid, standardized multi-protocol snapshot to a specific block and selected storage fields, then resolves a failed commitment from pre-reserved provider collateral without an LLM judge.

The claim is deliberately narrow. It does not establish the completeness of a Graph query, financial safety, APY correctness, or trustless source-chain finality.
