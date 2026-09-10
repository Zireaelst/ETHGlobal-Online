import { describe, expect, it } from "vitest";
import { findHederaTestnetCapability } from "./supported";

const supported = {
  kinds: [{ scheme: "exact", network: "hedera:testnet", x402Version: 2, extra: { feePayer: "0.0.7162784" } }],
  signers: { "hedera:*": ["0.0.7162784"] },
};

describe("findHederaTestnetCapability", () => {
  it("returns the exact Hedera testnet x402 v2 capability", () => {
    expect(findHederaTestnetCapability(supported)).toEqual({
      scheme: "exact",
      network: "hedera:testnet",
      x402Version: 2,
      feePayer: "0.0.7162784",
    });
  });

  it.each([
    [{ ...supported, kinds: [{ ...supported.kinds[0], network: "hedera:mainnet" }] }, "hedera:testnet"],
    [{ ...supported, kinds: [{ ...supported.kinds[0], x402Version: 1 }] }, "x402 v2"],
    [{ ...supported, kinds: [{ ...supported.kinds[0], scheme: "upto" }] }, "exact"],
    [{ ...supported, kinds: [{ ...supported.kinds[0], extra: {} }], signers: {} }, "fee payer"],
  ])("rejects unsupported capability data", (value, message) => {
    expect(() => findHederaTestnetCapability(value)).toThrow(message);
  });
});
