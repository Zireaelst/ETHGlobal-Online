import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ExecutionAdapters, GraphAdapter, PaymentAdapter } from "./ports";
import { describe, expect, it, vi } from "vitest";
import { BlockTermsError, type SubmitRequest } from "@blockterms/contracts";
import { readRuntimeConfig } from "./config";
import { BlockTermsService } from "./service";
import { JsonFileOrderRepository } from "./store";

const request: SubmitRequest = {
  mode: "simulation",
  query: { kind: "standardized-pools", blockNumber: 16, poolLimit: 1 },
  witness: { network: "eip155:1", address: `0x${"11".repeat(20)}`, slots: ["0x0"], block: "0x10" },
  policy: {
    maxPaymentAtomic: "1000",
    allowedPaymentNetworks: ["hedera:testnet"],
    resourceUrl: "https://resource.example/data",
    deadlineMs: 5_000,
  },
};

function adapters(overrides: Partial<ExecutionAdapters> = {}): ExecutionAdapters {
  return {
    graph: {
      fetch: vi.fn(async (query) => ["a", "b"].map((deploymentLabel) => ({
        source: "graph" as const,
        deploymentLabel,
        protocol: {
          id: "protocol", name: "Protocol", network: "mainnet", schemaVersion: "1",
          subgraphVersion: "1", methodologyVersion: "1",
        },
        block: { number: query.blockNumber },
        pools: [{ id: "pool", inputTokenIds: ["token"], inputTokenBalances: ["10"] }],
      }))),
    },
    witness: {
      fetch: vi.fn(async (witness: SubmitRequest["witness"]) => ({
        network: witness.network,
        address: witness.address,
        blockNumber: Number.parseInt(witness.block.slice(2), 16),
        accountProofBytes: 10,
        storageProofBytes: 20,
        slotCount: witness.slots.length,
        codeHash: "sim_code",
        storageValues: Object.fromEntries(witness.slots.map((slot) => [slot, "0x1"])),
      })),
    },
    payment: {
      pay: vi.fn(async () => ({
        receiptId: "sim_original_receipt",
        network: "hedera:testnet",
        amountAtomic: "100",
        asset: "sim_asset",
        observedAt: "2026-09-12T00:00:00.000Z",
      })),
    },
    ...overrides,
  };
}

async function service(options: { adapters?: ExecutionAdapters; environment?: Record<string, string>; marketplace?: { getProduct(id: string): Promise<any> }; credentialAccess?: { validate(grant: any): Promise<boolean> } } = {}) {
  const directory = await mkdtemp(join(tmpdir(), "blockterms-service-"));
  let uuidCounter = 0;
  return new BlockTermsService({
    repository: new JsonFileOrderRepository(join(directory, "orders.json")),
    adapters: { simulation: options.adapters ?? adapters() },
    config: readRuntimeConfig(options.environment ?? {}),
    clock: () => new Date("2026-09-12T00:00:00.000Z"),
    uuid: () => `00000000-0000-4000-8000-${String(++uuidCounter).padStart(12, "0")}`,
    ...(options.marketplace ? { marketplace: options.marketplace } : {}),
    ...(options.credentialAccess ? { credentialAccess: options.credentialAccess } : {}),
  });
}

describe("BlockTermsService", () => {
  it("runs a complete simulation lifecycle and exposes status and result", async () => {
    const runtime = await service();
    const submitted = await runtime.submit(request);
    const completed = await runtime.run(submitted.id);

    expect(submitted.phase).toBe("queued");
    expect(completed.phase).toBe("completed");
    expect(completed.protocolState).toEqual({
      kind: "accepted", orderId: submitted.id, mode: "simulation", deliveryId: expect.stringMatching(/^delivery_/),
    });
    expect(completed.result).toMatchObject({
      mode: "simulation", decision: "accepted", payment: { receiptId: "sim_original_receipt" },
    });
    await expect(runtime.getStatus(submitted.id)).resolves.toMatchObject({ id: submitted.id, phase: "completed" });
    await expect(runtime.getResult(submitted.id)).resolves.toEqual(completed.result);
  });

  it("records auto-mode fallback reasons before simulation starts", async () => {
    const runtime = await service();
    const submitted = await runtime.submit({ ...request, mode: "auto" });
    const completed = await runtime.run(submitted.id);

    expect(completed.selectedMode).toBe("simulation");
    expect(completed.fallbackReasons).toContain("missing:HEDERA_PRIVATE_KEY");
  });

  it("stores configuration_required for explicit live mode without calling an adapter", async () => {
    const simulation = adapters();
    const runtime = await service({ adapters: simulation });
    const submitted = await runtime.submit({ ...request, mode: "live" });
    const result = await runtime.run(submitted.id);

    expect(result.phase).toBe("configuration_required");
    expect(result.error).toMatchObject({ code: "CONFIGURATION_REQUIRED", missing: expect.arrayContaining(["HEDERA_PRIVATE_KEY"]) });
    expect(simulation.graph.fetch).not.toHaveBeenCalled();
  });

  it("rejects a concurrent second run", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const base = adapters();
    const waitingGraph: GraphAdapter = { fetch: vi.fn(async (query, context) => {
      await gate;
      return base.graph.fetch(query, context);
    }) };
    const runtime = await service({ adapters: adapters({ graph: waitingGraph }) });
    const submitted = await runtime.submit(request);
    const first = runtime.run(submitted.id);
    await vi.waitFor(async () => expect((await runtime.getOrder(submitted.id)).phase).toBe("running"));

    await expect(runtime.run(submitted.id)).rejects.toMatchObject({ code: "CONFLICT" });
    release();
    await expect(first).resolves.toMatchObject({ phase: "completed" });
  });

  it("stores sanitized upstream failures", async () => {
    const runtime = await service({ adapters: adapters({
      graph: { fetch: vi.fn(async () => { throw new Error("Bearer secret-upstream-value"); }) },
    }) });
    const submitted = await runtime.submit(request);
    const failed = await runtime.run(submitted.id);

    expect(failed.phase).toBe("failed");
    expect(failed.error).toEqual({ code: "UPSTREAM_ERROR", message: "Execution failed in an upstream adapter.", retryable: false });
    expect(JSON.stringify(failed)).not.toContain("secret-upstream-value");
  });

  it("preserves an original payment receipt without inventing a warranty receipt", async () => {
    const invalidGraph = { fetch: vi.fn(async () => [{ invalid: true }] as never) };
    const runtime = await service({ adapters: adapters({ graph: invalidGraph }) });
    const submitted = await runtime.submit(request);
    const failed = await runtime.run(submitted.id);

    expect(failed.phase).toBe("failed");
    expect(failed.protocolState).toEqual({
      kind: "paid", orderId: submitted.id, mode: "simulation", originalPaymentReceiptId: "sim_original_receipt",
    });
    expect(JSON.stringify(failed)).not.toContain("warrantyReceiptId");
  });

  it("uses stable not-found and result-not-ready errors", async () => {
    const runtime = await service();
    await expect(runtime.getOrder("00000000-0000-4000-8000-000000000099")).rejects.toEqual(
      expect.objectContaining({ code: "NOT_FOUND" }),
    );
    const submitted = await runtime.submit(request);
    await expect(runtime.getResult(submitted.id)).rejects.toBeInstanceOf(BlockTermsError);
  });

  it("validates pinned marketplace terms before execution", async () => {
    const product = {
      id: "00000000-0000-4000-8000-000000000101", state: "active", provider: { id: "provider-atlas" },
      manifest: { version: "1.0.0", commercial: { priceAtomic: "100", paymentNetwork: "hedera:testnet", resourceUrl: request.policy.resourceUrl } },
    };
    const runtime = await service({ marketplace: { getProduct: vi.fn(async () => product as any) } });
    const submitted = await runtime.submit({ ...request, marketplace: { productId: product.id, productVersion: "1.0.0", providerId: "provider-atlas" } });
    await expect(runtime.run(submitted.id)).resolves.toMatchObject({ phase: "completed" });
  });

  it("fails before payment when a selected product is inactive or changed", async () => {
    const pay = vi.fn(async () => ({ receiptId: "never", network: "hedera:testnet", amountAtomic: "100", observedAt: "2026-09-12T00:00:00.000Z" }));
    const payment: PaymentAdapter = { pay };
    const runtime = await service({ adapters: adapters({ payment }), marketplace: { getProduct: vi.fn(async () => ({
      id: "00000000-0000-4000-8000-000000000101", state: "suspended", provider: { id: "provider-atlas" },
      manifest: { version: "2.0.0", commercial: { priceAtomic: "100", paymentNetwork: "hedera:testnet", resourceUrl: request.policy.resourceUrl } },
    }) as any) } });
    const submitted = await runtime.submit({ ...request, marketplace: { productId: "00000000-0000-4000-8000-000000000101", productVersion: "1.0.0", providerId: "provider-atlas" } });
    await expect(runtime.run(submitted.id)).rejects.toMatchObject({ code: "POLICY_REJECTED" });
    expect(pay).not.toHaveBeenCalled();
  });

  it("requires a verifier-backed grant for credential-gated private products", async () => {
    const product = {
      id: "00000000-0000-4000-8000-000000000101", state: "active", provider: { id: "provider-atlas" },
      manifest: {
        version: "1.0.0",
        access: { visibility: "credential-gated", requiredCredentials: [{ kind: "organization", issuer: "kyb.example", subject: "accredited-research" }] },
        commercial: { priceAtomic: "100", paymentNetwork: "hedera:testnet", resourceUrl: request.policy.resourceUrl },
      },
    };
    const marketplace = { getProduct: vi.fn(async () => product as any) };
    const baseSelection = { productId: product.id, productVersion: "1.0.0", providerId: "provider-atlas" };
    const denied = await service({ marketplace });
    const deniedOrder = await denied.submit({ ...request, marketplace: baseSelection });
    await expect(denied.run(deniedOrder.id)).rejects.toMatchObject({ code: "POLICY_REJECTED" });

    const validate = vi.fn(async () => true);
    const allowed = await service({ marketplace, credentialAccess: { validate } });
    const accessGrants = [{
      kind: "organization", issuer: "kyb.example", subject: "accredited-research", verificationId: "verify-17",
      verifiedAt: "2026-09-11T08:00:00.000Z", expiresAt: "2026-10-13T08:00:00.000Z",
    }];
    const order = await allowed.submit({ ...request, marketplace: { ...baseSelection, accessGrants } });
    await expect(allowed.run(order.id)).resolves.toMatchObject({ phase: "completed" });
    expect(validate).toHaveBeenCalledWith(accessGrants[0]);
  });
});
