# Agent runtime architecture

## One service, four interfaces

`BlockTermsService` owns validation, state transitions, adapter selection and persistence. The SDK local transport calls it in process. The API wraps the same client contract over HTTP. The CLI and MCP server use the SDK, so they do not reimplement order behavior.

```text
SDK local ─┐
HTTP API ──┼─> BlockTermsService ─> atomic JSON order store
CLI ───────┤           │
MCP stdio ─┘           ├─> two standardized Graph deployments
                       ├─> EVM eth_getProof + pinned block header
                       └─> Hedera exact x402 paid resource
```

The store writes a complete versioned document to a same-directory temporary file and atomically renames it. Updates use compare-and-set revisions, and one repository instance serializes concurrent reads and writes. A corrupt document fails closed instead of being replaced.

## Mode selection

- `simulation` always uses deterministic adapters. Identifiers use a `sim_` prefix and payment output contains no transaction or explorer claim.
- `auto` uses live adapters only when every required live setting exists. Otherwise it selects simulation before execution and persists `missing:VARIABLE_NAME` reasons.
- `live` with incomplete settings becomes `configuration_required` before a network call.
- A started live execution never falls back. Its safe terminal error remains inspectable.

Live adapters are constructed on demand so simulation-only processes do not parse a private key or open a Hedera client.

## Durable lifecycle

The service persists `queued`, `running`, `configuration_required`, `failed`, and `completed` phases. During execution, protocol state advances through `quoted`, `reserved`, `payment-pending`, `paid`, and `accepted`. It writes `payment-pending` before invoking the irreversible payment adapter and writes the original settlement receipt immediately afterward.

A process interruption after payment begins cannot blindly rerun the order. This prevents an automatic duplicate payment. Reconciliation of an uncertain payment remains an explicit future operation.

The original x402 receipt and a warranty receipt are different fields and different transfers. The current production-local runtime accepts adapter-validated deliveries. If final result validation fails after settlement, it preserves the original paid state and does not invent a warranty transfer.

## Live adapter boundaries

The Graph adapter sends one query shape to two distinct endpoints at the same integer block. It rejects GraphQL errors, mismatched blocks, incompatible schema versions, mismatched token/balance arrays, oversized pool responses and timeouts. Authorization values never enter persisted results or errors.

The EVM adapter requests `eth_getProof` for the exact account and one to three slots, plus `eth_getBlockByNumber` for the same block. It validates the account, exact normalized slot set, pinned header and byte encoding, then reports selected values and proof sizes. This is bounded witness inspection; it does not claim query completeness or source-chain finality.

The payment adapter uses `@x402/core`, `@x402/fetch`, and `@x402/hedera`. Its selector accepts only the `exact` scheme on an allowed Hedera network, at the configured payee and asset, within the request budget. A successful paid retry must return a decodable settlement header. Live qualification still requires a funded request against a Blocky402-settled resource.

## Secret handling

Secrets are read from process environment when a local runtime is created. Order records, events, capabilities, errors and MCP output contain only public request data, safe receipt metadata and missing environment variable names. The API token is compared without logging and is required on `/v1` routes when configured.
