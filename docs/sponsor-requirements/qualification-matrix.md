# Sponsor qualification matrix

Status values are intentionally absent until implementation produces evidence. A checked box must link to a real artifact in the release commit.

## Hedera — AI & Agentic Payments

| Requirement | Planned implementation | Required evidence |
|---|---|---|
| Live x402-gated service on Hedera testnet/mainnet settled through Blocky402 | Provider snapshot endpoint | Public endpoint, 402 challenge, Blocky settlement receipt and HashScan link |
| Agent/platform consumes service and completes a real paid request | Bounded buyer agent | Decision trace, order binding, real payment and HTTP delivery |
| Public repo with setup, architecture and payment flow | This repository | Clean-clone commands, architecture and sequence diagram |
| Demo video ≤5 minutes showing paid request | One 240-second video | Visible request, payment, delivery and explorer receipt |

Optional HCS audit is useful only after the base flow works. ERC-8004, HCS-14, A2A, ACP, UCP, metering, HTS custom fees, and scheduled/streamed payments are not assumed.

## The Graph — Composable or Standardized Graph Products

| Requirement | Planned implementation | Required evidence |
|---|---|---|
| Meaningful standardized schema or composition | One typed query pattern across two compatible DEX protocol deployments | Query source and two protocol results |
| Live Graph provider data | Runtime Graph-provider requests | Provider/deployment IDs, block metadata and sanitized network trace |
| More than a single unstandardized subgraph query | Two protocols at a common eligible block | Side-by-side normalized output and version metadata |
| Make standards leverage clear | Protocol-independent request/adapter | Same request shape without per-protocol UI logic |
| Public repo and 2–4 minute video | This repository and common 240-second video | Public URLs and playable duration |

Fixtures may test UI and codecs but cannot satisfy live-data requirements. `schemaVersion`, `subgraphVersion`, `methodologyVersion`, deployment and block identity remain separate fields.

## Bazantic — conditional Sponsor API Recipe

Submit only after all gates below pass.

| Requirement | Planned implementation | Required evidence |
|---|---|---|
| Bazantic account and project gateway | Registered project integration | Required submission identity and live gateway URL |
| Another sponsor or catalog service | Live Graph discovery/query service | First Recipe step with real output |
| Two-service working Recipe | Graph scope feeds BlockTerms paid snapshot request | Reproducible external run and typed result |
| Final result depends on both services | No Graph scope means no request; no BlockTerms means no warranted result | Failure tests for each missing service |
| Screen recording and required account identifier | Included in demo/submission | Recording and non-secret account handle |

The integration must preserve Blocky402 settlement, order/payment binding, and idempotent retry. A Recipe wrapper or payment identifier is not the product's novelty.

## Disqualification controls

- No Continuity application.
- No mocked/static Graph data presented as qualifying live data.
- No custom facilitator presented as Blocky402.
- No optimistic or fabricated transaction, deployment, API or explorer evidence.
- No third sponsor submission unless every relevant row above has working evidence.

Primary source: [ETHOnline 2026 prizes](https://ethglobal.com/events/ethonline2026/prizes).

