import { describe, expect, it } from "vitest";
import { buildGetProofRequest } from "./request";
import { measureWitness } from "./measure";

describe("buildGetProofRequest", () => {
  it("constructs a bounded request at a numeric block", () => {
    expect(buildGetProofRequest("0x0000000000000000000000000000000000000001", ["0x0"], "0x10")).toEqual({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getProof",
      params: ["0x0000000000000000000000000000000000000001", ["0x0"], "0x10"],
    });
  });

  it.each([
    ["0x1", ["0x0"], "0x10", "20-byte"],
    ["0x0000000000000000000000000000000000000001", [], "0x10", "one to three"],
    ["0x0000000000000000000000000000000000000001", ["0x0", "0x1", "0x2", "0x3"], "0x10", "one to three"],
    ["0x0000000000000000000000000000000000000001", ["0x0", "0x0"], "0x10", "duplicate"],
    ["0x0000000000000000000000000000000000000001", ["0x0"], "latest", "numeric block"],
    ["0x0000000000000000000000000000000000000001", ["0x0"], "0x01", "numeric block"],
  ])("rejects an unsafe request", (address, slots, block, message) => {
    expect(() => buildGetProofRequest(address as string, slots as string[], block as string)).toThrow(message as string);
  });
});

describe("measureWitness", () => {
  it("counts decoded proof bytes and slots", () => {
    expect(measureWitness({
      address: "0x0000000000000000000000000000000000000001",
      accountProof: ["0x1234", "0xab"],
      balance: "0x0",
      codeHash: "0x12",
      nonce: "0x0",
      storageHash: "0x34",
      storageProof: [{ key: "0x0", value: "0x1", proof: ["0x123456"] }],
    }, 16)).toEqual({ accountProofBytes: 3, storageProofBytes: 3, slotCount: 1, blockNumber: 16, codeHash: "0x12" });
  });
});
