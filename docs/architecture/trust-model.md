# BlockTerms trust model

## What is verified

For a known source-chain contract and storage layout, a bounded account/storage witness can establish selected values against an accepted state root. The delivery manifest binds the order, buyer, provider, quote, source chain, block, state root, deployment/schema/method versions, contract code hash, selected fields, delivery deadline, price, payment target, and reserved warranty.

## What remains trusted

- The initial checkpoint quorum selects the correct finalized source-chain header/state root. It is not a light client.
- Payment observers reconcile the Hedera settlement to payer, payee, asset, amount and order. A browser-supplied transaction hash is insufficient.
- The verifier implementation and pinned storage layout are correct.
- The Graph provider and source RPC remain available.
- The source protocol contract itself has the intended semantics.
- Provider admission is curated in the first release.
- Marketplace credentials establish reviewed eligibility claims only. Their issuers, expiry, and references do not establish data ownership or correctness.

Running three observer processes under one operator is not three independent trust domains. Operator relationships must be disclosed.

## Economic safety invariants

- Reserved liabilities for an asset never exceed withdrawable provider collateral.
- Active reservation collateral cannot be withdrawn or reused.
- A settlement identifier and order identifier cannot fund more than one purchase state.
- A warranty is a separate transfer; the original x402 payment is never described as reversed.
- A buyer cannot create an invalid final delivery. Warranty evaluation requires the provider's signature and order-bound final commitment.
- A provider must publish the complete bounded public witness by the deadline. A hash without available bytes is not delivery.
- `PaymentPending` must reconcile before retry or collateral release.
- A terminal order cannot return to an active state.
- A marketplace order cannot silently follow a listing update. Product ID, version, provider, payment network, resource URL, and price remain pinned from selection through execution.

## Agent boundary

Provider content and model text are untrusted. The model can propose a supported query AST and rank quotes. Deterministic policy code enforces providers, chains, deployments, fields, maximum age, total budget, retry count, asset, payee, collateral minimum and verifier version. Spending-limit changes and unsupported scopes require human approval.

Marketplace search returns deterministic filter inputs and objective finalized-order metrics. It does not publish subjective star ratings. Live and simulation outcomes are stored and displayed separately.

## Marketplace audit boundary

The optional HCS adapter commits a canonical SHA-256 digest plus event identity to a configured topic. It does not publish the product payload, credential payload, buyer data, keys, or tokens. HCS ordering can show that a digest was anchored at a point in time; it does not approve a listing, validate a Graph result, prove data ownership, or replace the order verifier. Without `HCS_TOPIC_ID` and a Hedera operator, the adapter reports `configuration_required` and does not invent a reference.

## Proof limits shown in the UI

The UI must say which fields were checked and against which accepted root. It must not turn a green witness into claims about full query completeness, APY, USD valuation, economic safety, absence of manipulation before the block, or correctness of future state.

## Evidence separation

Live evidence and simulation fixtures use separate directories and badges. Explorer outages do not alter locally verified receipt state. Evidence exports contain public or sanitized artifacts, their hashes, run ID, network and release commit; they never contain credentials or payment authorization secrets.

## Phase 0 witness status

The bounded `eth_getProof` scaffold accepts only one approved 20-byte contract, one explicit numeric block, and one to three unique storage slots. It measures account- and storage-proof bytes and checks the accompanying RPC block number, but it does not accept the witness as valid. Acceptance requires an independently trusted state root, pinned code hash/storage layout, and the later Hedera verifier.

Current live-gate result (2026-09-10): **blocked**. `pnpm --dir spikes/storage-witness probe` stopped because `SOURCE_RPC_URL` and owner-approved pool arguments were not supplied. No public RPC, pool, block, or storage slot was guessed.
