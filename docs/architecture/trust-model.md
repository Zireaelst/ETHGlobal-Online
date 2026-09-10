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

## Agent boundary

Provider content and model text are untrusted. The model can propose a supported query AST and rank quotes. Deterministic policy code enforces providers, chains, deployments, fields, maximum age, total budget, retry count, asset, payee, collateral minimum and verifier version. Spending-limit changes and unsupported scopes require human approval.

## Proof limits shown in the UI

The UI must say which fields were checked and against which accepted root. It must not turn a green witness into claims about full query completeness, APY, USD valuation, economic safety, absence of manipulation before the block, or correctness of future state.

## Evidence separation

Live evidence and simulation fixtures use separate directories and badges. Explorer outages do not alter locally verified receipt state. Evidence exports contain public or sanitized artifacts, their hashes, run ID, network and release commit; they never contain credentials or payment authorization secrets.

