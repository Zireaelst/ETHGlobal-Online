import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { SubmitRequest } from "@blockterms/contracts";
import { createLocalClient } from "./local";

const request: SubmitRequest = {
  mode: "simulation",
  query: { kind: "standardized-pools", blockNumber: 16, poolLimit: 2 },
  witness: { network: "eip155:1", address: `0x${"11".repeat(20)}`, slots: ["0x0"], block: "0x10" },
  policy: {
    maxPaymentAtomic: "1000", allowedPaymentNetworks: ["hedera:testnet"],
    resourceUrl: "https://resource.example/data", deadlineMs: 5_000,
  },
};

const productRequest = {
  provider: { id: "provider-atlas", type: "agent" as const, displayName: "Atlas Agent" },
  manifest: {
    slug: "same-block-liquidity", name: "Same-block liquidity", summary: "Comparable live DEX liquidity with bounded proof coverage.", version: "1.0.0", kind: "snapshot" as const,
    tags: ["defi"], schema: { family: "messari-dex-amm", version: "1.0.0" }, networks: ["eip155:1"], deployments: ["dex-a", "dex-b"], freshnessSeconds: 30, deliverySeconds: 20,
    commercial: { priceAtomic: "100", paymentNetwork: "hedera:testnet", asset: "HBAR", resourceUrl: "https://atlas.example/data", warrantyAtomic: "120", collateralCoverageBps: 12000 },
    verification: { profile: "graph-eip1186-v1" as const, maxPools: 3, maxStorageSlots: 3 }, sample: { digest: `0x${"ab".repeat(32)}`, uri: "ipfs://bafy-example" }, credentials: [],
  },
};

describe("local BlockTerms client contract", () => {
  it("supports submit, run, retrieval, listing, health, and capabilities", async () => {
    const directory = await mkdtemp(join(tmpdir(), "blockterms-sdk-"));
    const client = createLocalClient({ storePath: join(directory, "orders.json"), environment: {} });

    const submitted = await client.submit(request);
    const completed = await client.run(submitted.id);

    await expect(client.getOrder(submitted.id)).resolves.toEqual(completed);
    await expect(client.getStatus(submitted.id)).resolves.toMatchObject({ phase: "completed" });
    await expect(client.getResult(submitted.id)).resolves.toEqual(completed.result);
    await expect(client.listOrders({ limit: 1 })).resolves.toEqual([completed]);
    await expect(client.health()).resolves.toEqual({ status: "ok", service: "blockterms", version: "0.1.0" });
    await expect(client.capabilities()).resolves.toMatchObject({
      modes: ["simulation", "live"], live: { ready: false }, interfaces: ["sdk", "http", "cli", "mcp"],
    });
  });

  it("reads an order persisted by a previous local client", async () => {
    const directory = await mkdtemp(join(tmpdir(), "blockterms-sdk-restart-"));
    const storePath = join(directory, "orders.json");
    const submitted = await createLocalClient({ storePath, environment: {} }).submit(request);

    await expect(createLocalClient({ storePath, environment: {} }).getOrder(submitted.id)).resolves.toEqual(submitted);
  });

  it("uses the same local client for marketplace publication and discovery", async () => {
    const directory = await mkdtemp(join(tmpdir(), "blockterms-market-sdk-"));
    const client = createLocalClient({ storePath: join(directory, "orders.json"), marketplaceStorePath: join(directory, "marketplace.json"), environment: {} });
    const draft = await client.submitProduct(productRequest);
    await expect(client.listProducts()).resolves.toEqual([]);
    const active = await client.reviewProduct(draft.id, {
      decision: "approve", curatorId: "curator-blockterms", reason: "Sandbox passed.",
      sandbox: { passed: true, checkedAt: "2026-09-13T08:00:00.000Z", sampleDigest: productRequest.manifest.sample.digest },
    });
    await expect(client.getProduct(active.manifest.slug)).resolves.toEqual(active);
    await expect(client.listProducts({ providerType: "agent" })).resolves.toEqual([active]);
    await expect(client.listProviders()).resolves.toHaveLength(1);
    await expect(client.getProvider("provider-atlas")).resolves.toMatchObject({ provider: productRequest.provider });
  });
});
