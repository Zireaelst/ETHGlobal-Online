import { describe, expect, it } from "vitest";
import {
  parseCreateBundleRequest,
  parseProductFilter,
  parseSubmitProductRequest,
  type SubmitProductRequest,
} from "./marketplace";

export const validProductRequest: SubmitProductRequest = {
  provider: { id: "provider-atlas", type: "agent", displayName: "Atlas Data Agent" },
  manifest: {
    slug: "same-block-dex-liquidity",
    name: "Same-block DEX liquidity",
    summary: "Comparable pool balances from two standardized DEX deployments.",
    version: "1.0.0",
    kind: "snapshot",
    tags: ["defi", "liquidity"],
    schema: { family: "messari-dex-amm", version: "1.0.0" },
    networks: ["eip155:1"],
    deployments: ["uniswap-v3-mainnet", "sushiswap-mainnet"],
    freshnessSeconds: 30,
    deliverySeconds: 20,
    commercial: {
      priceAtomic: "2500000",
      paymentNetwork: "hedera:testnet",
      asset: "HBAR",
      resourceUrl: "https://atlas.example/x402/snapshot",
      warrantyAtomic: "3000000",
      collateralCoverageBps: 12000,
    },
    verification: { profile: "graph-eip1186-v1", maxPools: 3, maxStorageSlots: 3 },
    sample: { digest: `0x${"ab".repeat(32)}`, uri: "ipfs://bafy-example" },
    credentials: [{ kind: "zk-tls", issuer: "zkpass", subject: "source-access", issuedAt: "2026-09-13T08:00:00.000Z", expiresAt: "2026-10-13T08:00:00.000Z", reference: "https://verify.example/proof/atlas" }],
  },
};

describe("marketplace contracts", () => {
  it("accepts a bounded product passport", () => {
    expect(parseSubmitProductRequest(validProductRequest)).toEqual(validProductRequest);
  });

  it("rejects secret-bearing manifest fields", () => {
    expect(() => parseSubmitProductRequest({ ...validProductRequest, metadata: { apiToken: "secret" } })).toThrow(/secret/i);
  });

  it("requires warranty collateral to cover at least the advertised warranty", () => {
    const commercial = { ...validProductRequest.manifest.commercial, collateralCoverageBps: 9999 };
    expect(() => parseSubmitProductRequest({ ...validProductRequest, manifest: { ...validProductRequest.manifest, commercial } })).toThrow(/10000/i);
  });

  it("accepts two-to-five explicit bundle components", () => {
    const parsed = parseCreateBundleRequest({
      ...validProductRequest,
      manifest: { ...validProductRequest.manifest, slug: "dex-bundle", name: "DEX Bundle", kind: "bundle" },
      composition: {
        method: "same-block-union",
        components: [
          { productId: "00000000-0000-4000-8000-000000000001", version: "1.0.0", outputAlias: "uniswap" },
          { productId: "00000000-0000-4000-8000-000000000002", version: "1.0.0", outputAlias: "sushiswap" },
        ],
      },
    });
    expect(parsed.composition.components).toHaveLength(2);
  });

  it("rejects duplicate bundle aliases", () => {
    expect(() => parseCreateBundleRequest({
      ...validProductRequest,
      manifest: { ...validProductRequest.manifest, slug: "dex-bundle", name: "DEX Bundle", kind: "bundle" },
      composition: {
        method: "same-block-union",
        components: [
          { productId: "00000000-0000-4000-8000-000000000001", version: "1.0.0", outputAlias: "dex" },
          { productId: "00000000-0000-4000-8000-000000000002", version: "1.0.0", outputAlias: "dex" },
        ],
      },
    })).toThrow(/alias/i);
  });

  it("validates deterministic discovery filters", () => {
    expect(parseProductFilter({ query: "liquidity", providerType: "agent", maxPriceAtomic: "3000000", credentialKind: "zk-tls" })).toMatchObject({ query: "liquidity" });
    expect(() => parseProductFilter({ maxPriceAtomic: "-1" })).toThrow(/positive/i);
  });

  it("declares credential-gated buyer access without storing credential payloads", () => {
    const access = {
      visibility: "credential-gated" as const,
      requiredCredentials: [{ kind: "organization" as const, issuer: "kyb.example", subject: "accredited-research" }],
    };
    const parsed = parseSubmitProductRequest({
      ...validProductRequest,
      manifest: { ...validProductRequest.manifest, access },
    });
    expect(parsed.manifest.access).toEqual(access);
    expect(JSON.stringify(parsed)).not.toMatch(/credentialPayload|rawProof/i);
  });
});
