import { describe, expect, it } from "vitest";
import { parseOrderRecord } from "./order";

const queued = {
  id: "00000000-0000-4000-8000-000000000001",
  createdAt: "2026-09-12T00:00:00.000Z",
  updatedAt: "2026-09-12T00:00:00.000Z",
  revision: 0,
  phase: "queued",
  requestedMode: "simulation",
  selectedMode: "simulation",
  fallbackReasons: [],
  request: {
    mode: "simulation",
    query: { kind: "standardized-pools", blockNumber: 16, poolLimit: 3 },
    witness: {
      network: "eip155:1",
      address: "0x0000000000000000000000000000000000000001",
      slots: ["0x0"],
      block: "0x10",
    },
    policy: {
      maxPaymentAtomic: "10000",
      allowedPaymentNetworks: ["hedera:testnet"],
      resourceUrl: "https://provider.example/v1/snapshot",
      deadlineMs: 30_000,
    },
  },
  protocolState: { kind: "quoted", orderId: "00000000-0000-4000-8000-000000000001", mode: "simulation" },
  events: [],
} as const;

describe("parseOrderRecord", () => {
  it("accepts a queued record", () => {
    expect(parseOrderRecord(queued)).toEqual(queued);
  });

  it("rejects a completed record without a result", () => {
    expect(() => parseOrderRecord({ ...queued, phase: "completed" })).toThrow("result");
  });

  it("rejects a failed record without a structured error", () => {
    expect(() => parseOrderRecord({ ...queued, phase: "failed" })).toThrow("error");
  });

  it("rejects secret-bearing event payloads", () => {
    expect(() => parseOrderRecord({
      ...queued,
      events: [{ at: queued.createdAt, type: "upstream", detail: { authorization: "Bearer secret" } }],
    })).toThrow("secret");
  });
});
