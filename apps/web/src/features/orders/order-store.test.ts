import { describe, expect, it } from "vitest";
import { marketplaceProducts } from "../marketplace/catalog";
import { createSimulationQuote, purchaseSimulationOrder, readSimulationOrder, readSimulationOrders, saveSimulationQuote, type StorageLike } from "./order-store";

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("simulation order store", () => {
  const product = marketplaceProducts[0]!;

  it("pins product terms and rejects a budget below price", () => {
    expect(() => createSimulationQuote({ product, maxBudgetAtomic: "1" })).toThrow(/budget/i);
    const order = createSimulationQuote({ product, maxBudgetAtomic: "3000000", id: "sim_fixed", now: "2026-09-13T12:00:00.000Z" });
    expect(order).toMatchObject({ id: "sim_fixed", profile: "simulation", status: "quoted", productSlug: product.manifest.slug, productVersion: "1.0.0", providerId: "provider-atlas", termsHash: product.manifest.sample.digest, priceAtomic: "2500000" });
  });

  it("persists one order and returns the same completed result", () => {
    const storage = new MemoryStorage();
    const quoted = createSimulationQuote({ product, maxBudgetAtomic: "3000000", id: "sim_fixed", now: "2026-09-13T12:00:00.000Z" });
    saveSimulationQuote(storage, quoted);
    const completed = purchaseSimulationOrder(storage, quoted.id, "2026-09-13T12:00:04.000Z");
    expect(completed).toMatchObject({ status: "completed", receiptId: "sim_receipt_sim_fixed", result: { mode: "simulation", decision: "accepted" } });
    expect(readSimulationOrder(storage, quoted.id)).toEqual(completed);
    expect(readSimulationOrders(storage)).toEqual([completed]);
  });
});
