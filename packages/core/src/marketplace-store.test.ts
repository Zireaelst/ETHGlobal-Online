import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DataProduct, ProviderProfile } from "@blockterms/contracts";
import { describe, expect, it } from "vitest";
import { JsonFileMarketplaceRepository } from "./marketplace-store";

const time = "2026-09-13T08:00:00.000Z";

function product(id: string, slug = "same-block-liquidity"): DataProduct {
  return {
    id, createdAt: time, updatedAt: time, revision: 0, state: "draft",
    provider: { id: "provider-atlas", type: "agent", displayName: "Atlas Agent" },
    manifest: {
      slug, name: "Same-block liquidity", summary: "Comparable live DEX liquidity with bounded proof coverage.", version: "1.0.0",
      kind: "snapshot", tags: ["defi"], schema: { family: "messari-dex-amm", version: "1.0.0" },
      networks: ["eip155:1"], deployments: ["dex-a", "dex-b"], freshnessSeconds: 30, deliverySeconds: 20,
      commercial: { priceAtomic: "100", paymentNetwork: "hedera:testnet", asset: "HBAR", resourceUrl: "https://atlas.example/data", warrantyAtomic: "120", collateralCoverageBps: 12000 },
      verification: { profile: "graph-eip1186-v1", maxPools: 3, maxStorageSlots: 3 },
      sample: { digest: `0x${"ab".repeat(32)}`, uri: "ipfs://bafy-example" }, credentials: [],
    },
  };
}

function profile(): ProviderProfile {
  return {
    provider: { id: "provider-atlas", type: "agent", displayName: "Atlas Agent" },
    productIds: [], credentials: [], outcomeOrderIds: [], liveLatenciesMs: [],
    metrics: { live: { completed: 0, valid: 0, invalid: 0, late: 0, warranties: 0, totalPaidAtomic: "0" }, simulation: { completed: 0, valid: 0, invalid: 0, late: 0, warranties: 0 } },
  };
}

async function storePath(): Promise<string> {
  return join(await mkdtemp(join(tmpdir(), "blockterms-market-")), "catalog.json");
}

describe("JsonFileMarketplaceRepository", () => {
  it("persists products and providers across instances", async () => {
    const path = await storePath();
    const repository = new JsonFileMarketplaceRepository(path);
    const expected = product("00000000-0000-4000-8000-000000000001");
    await repository.createProduct(expected);
    await repository.putProvider(profile());

    const reopened = new JsonFileMarketplaceRepository(path);
    await expect(reopened.getProduct(expected.id)).resolves.toEqual(expected);
    await expect(reopened.getProduct(expected.manifest.slug)).resolves.toEqual(expected);
    await expect(reopened.getProvider("provider-atlas")).resolves.toEqual(profile());
  });

  it("rejects duplicate identifiers and slugs", async () => {
    const repository = new JsonFileMarketplaceRepository(await storePath());
    await repository.createProduct(product("00000000-0000-4000-8000-000000000001"));
    await expect(repository.createProduct(product("00000000-0000-4000-8000-000000000001", "other"))).rejects.toThrow(/already exists/i);
    await expect(repository.createProduct(product("00000000-0000-4000-8000-000000000002"))).rejects.toThrow(/slug/i);
  });

  it("uses compare-and-set revisions", async () => {
    const repository = new JsonFileMarketplaceRepository(await storePath());
    const initial = product("00000000-0000-4000-8000-000000000001");
    await repository.createProduct(initial);
    const updated = await repository.updateProduct(initial.id, 0, (current) => ({ ...current, state: "pending-review" }));
    expect(updated.revision).toBe(1);
    await expect(repository.updateProduct(initial.id, 0, (current) => current)).rejects.toThrow(/revision/i);
  });

  it("serializes concurrent creates", async () => {
    const repository = new JsonFileMarketplaceRepository(await storePath());
    await Promise.all(Array.from({ length: 8 }, (_, index) => repository.createProduct(product(
      `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      `product-${index + 1}`,
    ))));
    await expect(repository.listProducts()).resolves.toHaveLength(8);
  });

  it("fails closed on corrupt storage", async () => {
    const path = await storePath();
    await writeFile(path, "not-json", "utf8");
    await expect(new JsonFileMarketplaceRepository(path).listProducts()).rejects.toThrow(/corrupt/i);
  });
});
