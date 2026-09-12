import { describe, expect, it } from "vitest";
import { createSimulationAdapters } from "./simulation";

const context = { orderId: "00000000-0000-4000-8000-000000000001", signal: new AbortController().signal };

describe("simulation adapters", () => {
  it("returns deterministic standardized data from two deployments at the requested block", async () => {
    const adapters = createSimulationAdapters();
    const request = { kind: "standardized-pools" as const, blockNumber: 19_000_000, poolLimit: 2 };

    const first = await adapters.graph.fetch(request, context);
    const second = await adapters.graph.fetch(request, context);

    expect(first).toEqual(second);
    expect(first).toHaveLength(2);
    expect(first.map((snapshot) => snapshot.deploymentLabel)).toEqual(["simulation-a", "simulation-b"]);
    expect(first.every((snapshot) => snapshot.block.number === request.blockNumber && snapshot.pools.length === 2)).toBe(true);
    expect(new Set(first.map((snapshot) => snapshot.protocol.schemaVersion))).toEqual(new Set(["messari-standard-v1"]));
  });

  it("binds the witness to the requested account, block, and bounded slot set", async () => {
    const adapters = createSimulationAdapters();
    const request = {
      network: "eip155:1",
      address: `0x${"12".repeat(20)}`,
      slots: ["0x0", "0x2"],
      block: "0x10",
    };

    const witness = await adapters.witness.fetch(request, context);

    expect(witness).toMatchObject({ network: request.network, address: request.address, blockNumber: 16, slotCount: 2 });
    expect(Object.keys(witness.storageValues)).toEqual(request.slots);
    expect(witness.accountProofBytes).toBeGreaterThan(0);
    expect(witness.storageProofBytes).toBeGreaterThan(0);
  });

  it("emits a simulation receipt without a transaction or explorer claim", async () => {
    const adapters = createSimulationAdapters();
    const request = {
      maxPaymentAtomic: "1000",
      allowedPaymentNetworks: ["hedera:testnet"],
      resourceUrl: "https://resource.example/data",
      deadlineMs: 10_000,
    };

    const first = await adapters.payment.pay(request, context);
    const second = await adapters.payment.pay(request, context);

    expect(first).toEqual(second);
    expect(first.receiptId).toMatch(/^sim_/);
    expect(first.transactionId).toBeUndefined();
    expect(JSON.stringify(first).toLowerCase()).not.toMatch(/explorer|hashscan|transactionhash/);
  });
});
