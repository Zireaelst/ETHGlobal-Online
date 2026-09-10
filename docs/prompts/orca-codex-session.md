# Orca/Codex starting prompt

Paste the prompt below into a Codex terminal opened at `/Users/toyguntez/orca/ETHGlobal-Online` after reviewing and approving the written specification.

---

You are implementing the fresh ETHOnline 2026 project in this repository. Start by reading `AGENTS.md`, `README.md`, every Markdown file under `docs/`, and the Git status/history. Treat those repository documents as the source of truth. The repo currently has a documentation-only initial commit and no application scaffold.

The first dependency-ordered plan is `docs/superpowers/plans/2026-09-10-phase0-and-web-foundation.md`. Review it against the current repository and execute it only after the owner chooses the execution mode. Do not silently expand its milestone. It separates:

1. Phase 0 integration spikes: real Blocky402 request/settlement binding, two live compatible standardized Graph deployments at an eligible common block, and a bounded EIP-1186 witness verification benchmark on Hedera EVM.
2. Workspace and Next.js/Vercel foundation.
3. MotionSites-inspired design system and single-viewport landing.
4. How It Works, Proofs, Providers, Demo and Docs routes.
5. Typed protocol/state interfaces and explicit simulation mode.
6. Real sponsor integration, contracts, agents and evidence export.
7. Security, accessibility, production build, Vercel preview and submission evidence.

The frontend visual brief is `docs/prompts/motionsites-blockterms.md`. Preserve its visual intent while following the product boundaries in `AGENTS.md` and the approved design spec. Do not copy the Vesper name or text. Do not build fake live states, explorer links, metrics, transaction hashes or sponsor integrations.

Recommend the smallest reliable workspace/tooling choices that support `apps/web`, shared packages, Solidity/Foundry contracts and TypeScript services. Before selecting exact dependency versions or sponsor APIs, verify current official documentation. State any access, testnet funds, API keys, external accounts or product decisions that require the owner.

Before execution, report the plan's external prerequisites and confirm whether this Orca session will execute tasks inline or coordinate supervised workers. Do not create the application scaffold or install dependencies until that choice is explicit.

---
