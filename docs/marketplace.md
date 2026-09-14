# Verified data marketplace

BlockTerms is a curated market for bounded data products that can enter the existing payment, delivery, verification, and warranty lifecycle. Humans use `/marketplace`, product passport pages, provider profiles, and `/sell`. Agents use the same catalog through the TypeScript SDK, HTTP API, CLI, or MCP server.

## Product passport

Each product pins its provider, semantic version, standardized schema family, source networks and deployments, freshness and delivery bounds, Hedera payment terms, x402 resource URL, collateral coverage, sample digest, and executable proof profile. The first active profile is `graph-eip1186-v1`. Manifests are strict JSON, limited to 32 KiB, and reject secret-bearing keys.

Products move from draft to review and become active only after a curator supplies a passing sandbox result whose digest matches the committed sample. Rejected, suspended, deprecated, and draft products are excluded from normal discovery. Active slugs are unique.

## Composable bundles

A `same-block-union` bundle contains two to five active component products. Every component pins a product ID, version, and unique output alias. The service rejects components whose schema family, schema version, source network, payment network, or proof profile cannot be composed under one same-block request. Bundle lineage remains visible in the passport and agent response.

## Credentialed private data

A product may declare public access or a credential gate. A gate lists one to five required credential kinds and may constrain issuer and subject. The buyer sends only opaque, expiring access-grant receipts:

```json
{
  "marketplace": {
    "productId": "00000000-0000-4000-8000-000000000101",
    "productVersion": "1.0.0",
    "providerId": "provider-atlas",
    "accessGrants": [{
      "kind": "organization",
      "issuer": "kyb.example",
      "subject": "accredited-research",
      "verificationId": "verify-17",
      "verifiedAt": "2026-09-13T08:00:00.000Z",
      "expiresAt": "2026-10-13T08:00:00.000Z"
    }]
  }
}
```

The core checks kind, issuer, subject, issue time, and expiry, then asks the configured credential adapter to validate the opaque receipt. Missing, expired, mismatched, self-asserted, or verifier-rejected grants stop before payment. Set `CREDENTIAL_VERIFIER_URL` and optionally `CREDENTIAL_VERIFIER_TOKEN` to wire an external zkTLS, KYB, wallet-control, or other verifier into the local SDK runtime. Raw proofs, personal data, and verifier tokens never enter the catalog or order.

Credentials control eligibility. They do not prove the product is correct, complete, fresh, legally owned, or successfully delivered. Only the configured delivery verifier and finalized order outcome affect performance metrics.

## Version-pinned purchase

An order selected from the market includes `productId`, `productVersion`, and `providerId`. Immediately before execution, BlockTerms reloads the catalog and requires the listing to remain active. It compares the version, provider, resource URL, payment network, and price with the request policy. Any drift stops before Graph, witness, or payment adapters run.

## Objective provider records

Provider profiles contain product IDs, reviewed credential references, order IDs, and finalized outcome counts. Live totals, payment volume, latency percentiles, invalid deliveries, late deliveries, and warranties remain separate from simulation counts. Recording the same outcome twice is idempotent. There are no subjective star ratings.

## HCS audit anchoring

`HederaHcsMarketplaceAuditAnchor` uses the official `@hiero-ledger/sdk` to submit a compact digest envelope to a configured Hedera Consensus Service topic. Set `HCS_TOPIC_ID`, `HEDERA_ACCOUNT_ID`, `HEDERA_PRIVATE_KEY`, and `HEDERA_NETWORK`. `canonicalMarketplaceDigest` sorts object keys and hashes canonical JSON with SHA-256. Secret-bearing fields and payloads larger than 32 KiB are rejected before submission.

The HCS message contains event identity and the digest, not the product or credential payload. Its receipt records the network, topic ID, transaction ID, sequence number, and digest. HCS provides ordered audit evidence; curator decisions and delivery validation remain in their respective services. Missing configuration returns a disabled status and `configuration_required` rather than a simulated network receipt.

## Local commands

```bash
pnpm agent:build
pnpm agent:cli -- market submit --file examples/marketplace/product.json
pnpm agent:cli -- market list --network eip155:1 --max-price 5000000
pnpm agent:cli -- market get same-block-liquidity
pnpm agent:cli -- providers list
pnpm market:e2e
```

The local JSON stores default to `.blockterms/orders.json` and `.blockterms/marketplace.json`. Writes use temporary-file replacement, per-process serialization, optimistic revisions, and fail-closed parsing for corrupt files.

## Hosted release boundary

The Vercel pages currently render clearly marked example catalog records so the interface remains reviewable without credentials. Those records are not live listings, provider history, payments, or sponsor evidence. A hosted runtime needs durable storage, authentication around mutation routes, funded Hedera testnet credentials, live Graph endpoints, a compatible RPC endpoint, real x402 resources, and optional verifier/HCS configuration.
