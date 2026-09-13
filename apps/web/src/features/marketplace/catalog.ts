import type { DataProduct } from "@blockterms/contracts";

const createdAt = "2026-09-13T08:00:00.000Z";
const digest = (value: string) => `0x${value.repeat(64).slice(0, 64)}`;

const base = {
  createdAt, updatedAt: createdAt, revision: 2, state: "active" as const,
  manifest: {
    version: "1.0.0", tags: ["defi", "agent-ready"], schema: { family: "messari-dex-amm", version: "1.0.0" },
    networks: ["eip155:1"], deployments: ["standardized-dex-a", "standardized-dex-b"], freshnessSeconds: 30, deliverySeconds: 20,
    verification: { profile: "graph-eip1186-v1" as const, maxPools: 3, maxStorageSlots: 3 },
    credentials: [],
  },
};

export const marketplaceProducts: DataProduct[] = [
  {
    ...base, id: "00000000-0000-4000-8000-000000000101",
    provider: { id: "provider-atlas", type: "agent", displayName: "Atlas Data Agent" },
    manifest: {
      ...base.manifest, slug: "same-block-liquidity", name: "Same-block Liquidity", summary: "Comparable live pool balances across two standardized DEX deployments at one pinned block.", kind: "snapshot",
      commercial: { priceAtomic: "2500000", paymentNetwork: "hedera:testnet", asset: "HBAR", resourceUrl: "https://example.invalid/x402/liquidity", warrantyAtomic: "3000000", collateralCoverageBps: 12000 },
      sample: { digest: digest("a"), uri: "ipfs://example-catalog-record" },
      credentials: [{ kind: "zk-tls", issuer: "Example verifier", subject: "source access", issuedAt: createdAt, expiresAt: "2026-10-13T08:00:00.000Z", reference: "https://example.invalid/credential" }],
    },
    review: { curatorId: "example-curator", reason: "Example UI record; no live publication claim.", reviewedAt: createdAt, sandbox: { passed: true, checkedAt: createdAt, sampleDigest: digest("a") } },
  },
  {
    ...base, id: "00000000-0000-4000-8000-000000000102",
    provider: { id: "provider-beacon", type: "organization", displayName: "Beacon Research" },
    manifest: {
      ...base.manifest, slug: "risk-signal-brief", name: "Risk Signal Brief", summary: "A bounded report that joins standardized liquidity observations with declared risk indicators.", kind: "report", freshnessSeconds: 120, deliverySeconds: 45,
      access: { visibility: "credential-gated", requiredCredentials: [{ kind: "organization", issuer: "kyb.example", subject: "accredited-research" }] },
      commercial: { priceAtomic: "1800000", paymentNetwork: "hedera:testnet", asset: "HBAR", resourceUrl: "https://example.invalid/x402/risk", warrantyAtomic: "1800000", collateralCoverageBps: 10000 },
      sample: { digest: digest("b"), uri: "ipfs://example-risk-record" },
    },
    review: { curatorId: "example-curator", reason: "Example UI record; no live publication claim.", reviewedAt: createdAt, sandbox: { passed: true, checkedAt: createdAt, sampleDigest: digest("b") } },
  },
  {
    ...base, id: "00000000-0000-4000-8000-000000000103",
    provider: { id: "provider-atlas", type: "agent", displayName: "Atlas Data Agent" },
    manifest: {
      ...base.manifest, slug: "treasury-decision-bundle", name: "Treasury Decision Bundle", summary: "Two version-pinned products composed into one same-block procurement plan with public lineage.", kind: "bundle",
      commercial: { priceAtomic: "4300000", paymentNetwork: "hedera:testnet", asset: "HBAR", resourceUrl: "https://example.invalid/x402/bundle", warrantyAtomic: "4800000", collateralCoverageBps: 11200 },
      sample: { digest: digest("c"), uri: "ipfs://example-bundle-record" },
    },
    composition: { method: "same-block-union", components: [
      { productId: "00000000-0000-4000-8000-000000000101", version: "1.0.0", outputAlias: "liquidity" },
      { productId: "00000000-0000-4000-8000-000000000102", version: "1.0.0", outputAlias: "risk_signal" },
    ] },
    review: { curatorId: "example-curator", reason: "Example UI record; no live publication claim.", reviewedAt: createdAt, sandbox: { passed: true, checkedAt: createdAt, sampleDigest: digest("c") } },
  },
];

export const marketplaceProviders = [
  { id: "provider-atlas", name: "Atlas Data Agent", type: "Agent", liveOrders: 0, simulationOrders: 18, validRate: "No live history", collateral: "Example 120%", credentials: "Example zkTLS access signal" },
  { id: "provider-beacon", name: "Beacon Research", type: "Organization", liveOrders: 0, simulationOrders: 11, validRate: "No live history", collateral: "Example 100%", credentials: "Curator-reviewed organization signal" },
];

export function productBySlug(slug: string) {
  return marketplaceProducts.find((product) => product.manifest.slug === slug);
}
