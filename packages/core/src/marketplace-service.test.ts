import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SubmitProductRequest } from "@blockterms/contracts";
import { describe, expect, it } from "vitest";
import { MarketplaceService } from "./marketplace-service";
import { JsonFileMarketplaceRepository } from "./marketplace-store";

const time = "2026-09-13T08:00:00.000Z";
const sampleDigest = `0x${"ab".repeat(32)}`;

function request(slug = "same-block-liquidity", providerId = "provider-atlas", network = "eip155:1"): SubmitProductRequest {
  return {
    provider: { id: providerId, type: "agent", displayName: providerId === "provider-atlas" ? "Atlas Agent" : "Beacon Data" },
    manifest: {
      slug, name: slug.replaceAll("-", " "), summary: "Comparable live DEX liquidity with bounded proof coverage.", version: "1.0.0",
      kind: "snapshot", tags: ["defi", "liquidity"], schema: { family: "messari-dex-amm", version: "1.0.0" },
      networks: [network], deployments: ["dex-a", "dex-b"], freshnessSeconds: 30, deliverySeconds: 20,
      commercial: { priceAtomic: "100", paymentNetwork: "hedera:testnet", asset: "HBAR", resourceUrl: `https://${providerId}.example/data`, warrantyAtomic: "120", collateralCoverageBps: 12000 },
      verification: { profile: "graph-eip1186-v1", maxPools: 3, maxStorageSlots: 3 },
      sample: { digest: sampleDigest, uri: "ipfs://bafy-example" }, credentials: [],
    },
  };
}

async function service() {
  const path = join(await mkdtemp(join(tmpdir(), "blockterms-market-service-")), "catalog.json");
  let counter = 0;
  return new MarketplaceService({
    repository: new JsonFileMarketplaceRepository(path),
    clock: () => new Date(time),
    uuid: () => `00000000-0000-4000-8000-${String(++counter).padStart(12, "0")}`,
  });
}

async function approve(market: MarketplaceService, id: string) {
  return market.reviewProduct(id, {
    decision: "approve", curatorId: "curator-blockterms", reason: "Schema, sample and collateral verified.",
    sandbox: { passed: true, checkedAt: time, sampleDigest },
  });
}

describe("MarketplaceService", () => {
  it("publishes only after a passing curator review", async () => {
    const market = await service();
    const draft = await market.submitProduct(request());
    expect(draft.state).toBe("draft");
    await expect(market.listProducts()).resolves.toEqual([]);

    const active = await approve(market, draft.id);
    expect(active.state).toBe("active");
    await expect(market.listProducts()).resolves.toEqual([active]);
  });

  it("rejects approval when the sandbox digest does not match", async () => {
    const market = await service();
    const draft = await market.submitProduct(request());
    await expect(market.reviewProduct(draft.id, {
      decision: "approve", curatorId: "curator-blockterms", reason: "Bad sample.",
      sandbox: { passed: true, checkedAt: time, sampleDigest: `0x${"cd".repeat(32)}` },
    })).rejects.toThrow(/digest/i);
  });

  it("filters active products with deterministic facts", async () => {
    const market = await service();
    const first = await market.submitProduct(request());
    const second = await market.submitProduct(request("risk-signals", "provider-beacon"));
    await approve(market, first.id);
    await approve(market, second.id);

    await expect(market.listProducts({ query: "atlas", providerType: "agent", maxPriceAtomic: "100" })).resolves.toHaveLength(1);
    await expect(market.listProducts({ maxPriceAtomic: "99" })).resolves.toEqual([]);
  });

  it("suspends an active product without deleting its history", async () => {
    const market = await service();
    const active = await approve(market, (await market.submitProduct(request())).id);
    const suspended = await market.reviewProduct(active.id, { decision: "suspend", curatorId: "curator-blockterms", reason: "Delivery challenge failed." });
    expect(suspended.state).toBe("suspended");
    await expect(market.listProducts()).resolves.toEqual([]);
    await expect(market.listProducts({ includeInactive: true })).resolves.toContainEqual(suspended);
  });

  it("creates a compatible bundle with explicit lineage", async () => {
    const market = await service();
    const first = await approve(market, (await market.submitProduct(request())).id);
    const second = await approve(market, (await market.submitProduct(request("verified-risk-feed", "provider-beacon"))).id);
    const bundle = await market.createBundle({
      ...request("treasury-data-bundle"),
      manifest: { ...request("treasury-data-bundle").manifest, kind: "bundle" },
      composition: { method: "same-block-union", components: [
        { productId: first.id, version: first.manifest.version, outputAlias: "liquidity" },
        { productId: second.id, version: second.manifest.version, outputAlias: "risk" },
      ] },
    });
    expect(bundle.composition?.components).toHaveLength(2);
    expect(bundle.state).toBe("draft");
  });

  it("rejects bundles with inactive or incompatible components", async () => {
    const market = await service();
    const active = await approve(market, (await market.submitProduct(request())).id);
    const incompatible = await approve(market, (await market.submitProduct(request("other-network", "provider-beacon", "eip155:8453"))).id);
    const bundleRequest = {
      ...request("bad-bundle"), manifest: { ...request("bad-bundle").manifest, kind: "bundle" as const },
      composition: { method: "same-block-union" as const, components: [
        { productId: active.id, version: "1.0.0", outputAlias: "alpha" },
        { productId: incompatible.id, version: "1.0.0", outputAlias: "beta" },
      ] },
    };
    await expect(market.createBundle(bundleRequest)).rejects.toThrow(/network/i);
  });

  it("requires bundle settlement, schema version, and buyer access to cover every component", async () => {
    const market = await service();
    const gatedRequest = request();
    gatedRequest.manifest.access = {
      visibility: "credential-gated",
      requiredCredentials: [{ kind: "organization", issuer: "kyb.example", subject: "accredited-research" }],
    };
    const first = await approve(market, (await market.submitProduct(gatedRequest)).id);
    const incompatibleSettlement = request("risk-input", "provider-beacon");
    incompatibleSettlement.manifest.commercial = { ...incompatibleSettlement.manifest.commercial, asset: "USDC" };
    const second = await approve(market, (await market.submitProduct(incompatibleSettlement)).id);
    const base = request("treasury-bundle");
    const composition = { method: "same-block-union" as const, components: [
      { productId: first.id, version: "1.0.0", outputAlias: "liquidity" },
      { productId: second.id, version: "1.0.0", outputAlias: "risk" },
    ] };
    await expect(market.createBundle({ ...base, manifest: { ...base.manifest, kind: "bundle" }, composition })).rejects.toThrow(/settlement/i);

    const compatibleMarket = await service();
    const gated = await approve(compatibleMarket, (await compatibleMarket.submitProduct(gatedRequest)).id);
    const publicProduct = await approve(compatibleMarket, (await compatibleMarket.submitProduct(request("risk-input", "provider-beacon"))).id);
    const compatibleComposition = { ...composition, components: [
      { productId: gated.id, version: "1.0.0", outputAlias: "liquidity" },
      { productId: publicProduct.id, version: "1.0.0", outputAlias: "risk" },
    ] };
    await expect(compatibleMarket.createBundle({ ...base, manifest: { ...base.manifest, kind: "bundle" }, composition: compatibleComposition })).rejects.toThrow(/access/i);
    await expect(compatibleMarket.createBundle({
      ...base,
      manifest: { ...base.manifest, slug: "private-treasury-bundle", kind: "bundle", access: gatedRequest.manifest.access },
      composition: compatibleComposition,
    })).resolves.toMatchObject({ state: "draft" });
  });

  it("derives reputation from unique outcomes and separates simulation", async () => {
    const market = await service();
    const active = await approve(market, (await market.submitProduct(request())).id);
    const liveOutcome = { orderId: "10000000-0000-4000-8000-000000000001", productId: active.id, providerId: "provider-atlas", mode: "live" as const, outcome: "valid" as const, warrantyPaid: false, paidAtomic: "100", latencyMs: 80 };
    await market.recordOutcome(liveOutcome);
    await market.recordOutcome(liveOutcome);
    await market.recordOutcome({ ...liveOutcome, orderId: "10000000-0000-4000-8000-000000000002", mode: "simulation", outcome: "invalid", warrantyPaid: true, latencyMs: 120 });

    const profile = await market.getProvider("provider-atlas");
    expect(profile.metrics.live).toMatchObject({ completed: 1, valid: 1, invalid: 0, totalPaidAtomic: "100", medianLatencyMs: 80, p95LatencyMs: 80 });
    expect(profile.metrics.simulation).toMatchObject({ completed: 1, invalid: 1, warranties: 1 });
  });
});
