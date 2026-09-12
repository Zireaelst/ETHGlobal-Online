import { createServer, type Server } from "node:http";
import { encodePaymentResponseHeader } from "@x402/core/http";
import type { PaymentRequirements } from "@x402/core/types";
import { afterEach, describe, expect, it } from "vitest";
import { HederaX402Adapter, selectPaymentRequirement } from "./payment";

const servers: Server[] = [];
const baseRequirement: PaymentRequirements = {
  scheme: "exact",
  network: "hedera:testnet",
  asset: "0.0.429274",
  amount: "100",
  payTo: "0.0.4321",
  maxTimeoutSeconds: 60,
  extra: {},
};
const policy = {
  maxPaymentAtomic: "1000",
  allowedPaymentNetworks: ["hedera:testnet"],
  expectedPayee: "0.0.4321",
  expectedAsset: "0.0.429274",
};

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

describe("selectPaymentRequirement", () => {
  it("selects an exact Hedera requirement within every policy bound", () => {
    expect(selectPaymentRequirement([baseRequirement], policy)).toEqual(baseRequirement);
  });

  it.each([
    [{ network: "eip155:8453" }, /Hedera/i],
    [{ scheme: "upto" }, /exact/i],
    [{ amount: "1001" }, /budget/i],
    [{ payTo: "0.0.9999" }, /payee/i],
    [{ asset: "0.0.1" }, /asset/i],
  ] as const)("rejects a payment requirement outside policy: %j", (change, message) => {
    expect(() => selectPaymentRequirement([{ ...baseRequirement, ...change } as PaymentRequirements], policy)).toThrow(message);
  });
});

describe("HederaX402Adapter", () => {
  it("decodes a settled response into a sanitized payment receipt", async () => {
    const header = encodePaymentResponseHeader({
      success: true,
      transaction: "0.0.1234@1700000000.000000001",
      network: "hedera:testnet",
      amount: "100",
    });
    const adapter = new HederaX402Adapter({
      accountId: "0.0.1234",
      privateKey: "test-is-injected-so-this-is-not-parsed",
      expectedPayee: policy.expectedPayee,
      expectedAsset: policy.expectedAsset,
      network: "hedera:testnet",
      paidFetch: async () => new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "payment-response": header },
      }),
    });

    await expect(adapter.pay({
      maxPaymentAtomic: "1000",
      allowedPaymentNetworks: ["hedera:testnet"],
      resourceUrl: "https://resource.example/data",
      deadlineMs: 1_000,
    }, { orderId: "order-1", signal: new AbortController().signal })).resolves.toMatchObject({
      receiptId: "0.0.1234@1700000000.000000001",
      transactionId: "0.0.1234@1700000000.000000001",
      network: "hedera:testnet",
      amountAtomic: "100",
      asset: "0.0.429274",
    });
  });

  it("requires a settlement response header", async () => {
    const adapter = new HederaX402Adapter({
      accountId: "0.0.1234", privateKey: "injected", expectedPayee: policy.expectedPayee,
      expectedAsset: policy.expectedAsset, network: "hedera:testnet",
      paidFetch: async () => new Response("ok", { status: 200 }),
    });
    await expect(adapter.pay({
      maxPaymentAtomic: "1000", allowedPaymentNetworks: ["hedera:testnet"],
      resourceUrl: "https://resource.example/data", deadlineMs: 1_000,
    }, { orderId: "order-1", signal: new AbortController().signal })).rejects.toThrow(/settlement header/i);
  });

  it("rejects a non-2xx paid retry from a local 402 resource", async () => {
    let calls = 0;
    const server = createServer((_request, response) => {
      calls += 1;
      response.writeHead(calls === 1 ? 402 : 503, { "content-type": "application/json" });
      response.end(JSON.stringify({ payment: "required" }));
    });
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const bound = server.address();
    if (!bound || typeof bound === "string") throw new Error("Fixture did not bind.");
    const resourceUrl = `http://127.0.0.1:${bound.port}/paid`;
    const paidFetch: typeof fetch = async (input, init) => {
      await fetch(input, init);
      return fetch(input, { ...init, headers: { ...Object.fromEntries(new Headers(init?.headers)), "payment-signature": "fixture" } });
    };
    const adapter = new HederaX402Adapter({
      accountId: "0.0.1234", privateKey: "injected", expectedPayee: policy.expectedPayee,
      expectedAsset: policy.expectedAsset, network: "hedera:testnet", paidFetch,
    });

    await expect(adapter.pay({
      maxPaymentAtomic: "1000", allowedPaymentNetworks: ["hedera:testnet"], resourceUrl, deadlineMs: 1_000,
    }, { orderId: "order-1", signal: new AbortController().signal })).rejects.toThrow(/HTTP 503/i);
    expect(calls).toBe(2);
  });
});
