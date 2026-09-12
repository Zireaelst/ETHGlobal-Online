import { describe, expect, it } from "vitest";
import { parseSubmitRequest } from "./request";

const validRequest = {
  mode: "simulation",
  query: { kind: "standardized-pools", blockNumber: 16, poolLimit: 3 },
  witness: {
    network: "eip155:1",
    address: "0x0000000000000000000000000000000000000001",
    slots: ["0x0", "0x1"],
    block: "0x10",
  },
  policy: {
    maxPaymentAtomic: "10000",
    allowedPaymentNetworks: ["hedera:testnet"],
    resourceUrl: "https://provider.example/v1/snapshot",
    deadlineMs: 30_000,
  },
  metadata: { caller: "test-agent", attempt: 1 },
} as const;

describe("parseSubmitRequest", () => {
  it("accepts a bounded request and applies no hidden changes", () => {
    expect(parseSubmitRequest(validRequest)).toEqual(validRequest);
  });

  it("defaults optional execution controls", () => {
    const { mode: _mode, metadata: _metadata, query, ...rest } = validRequest;
    const { poolLimit: _poolLimit, ...queryWithoutLimit } = query;
    expect(parseSubmitRequest({ ...rest, query: queryWithoutLimit })).toMatchObject({
      mode: "auto",
      query: { poolLimit: 3 },
    });
  });

  it.each([
    [{ ...validRequest, query: { ...validRequest.query, blockNumber: 17 } }, "same pinned block"],
    [{ ...validRequest, witness: { ...validRequest.witness, slots: [] } }, "at least one"],
    [{ ...validRequest, witness: { ...validRequest.witness, slots: ["0x0", "0x0"] } }, "unique"],
    [{ ...validRequest, policy: { ...validRequest.policy, maxPaymentAtomic: "0" } }, "positive"],
    [{ ...validRequest, policy: { ...validRequest.policy, resourceUrl: "file:///secret" } }, "HTTP"],
  ])("rejects an unsafe request", (input, message) => {
    expect(() => parseSubmitRequest(input)).toThrow(message);
  });

  it("rejects metadata larger than 8 KiB", () => {
    expect(() => parseSubmitRequest({ ...validRequest, metadata: { payload: "x".repeat(8_193) } })).toThrow("8 KiB");
  });

  it("rejects values that cannot be represented as JSON", () => {
    expect(() => parseSubmitRequest({ ...validRequest, metadata: { invalid: BigInt(1) } })).toThrow("JSON");
  });
});
