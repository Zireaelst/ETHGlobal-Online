import { describe, expect, it } from "vitest";
import { parseStandardizedSnapshot } from "./schema";

const fixture = {
  protocol: {
    id: "deployment-a",
    name: "Protocol A",
    network: "mainnet",
    schemaVersion: "1.0.0",
    subgraphVersion: "1.0.0",
    methodologyVersion: "1.0.0",
  },
  _meta: { block: { number: 19000000, hash: "block-hash-redacted" } },
  pools: [{ id: "pool-a", inputTokenIds: ["token-a", "token-b"], inputTokenBalances: ["123", "456"] }],
};

describe("parseStandardizedSnapshot", () => {
  it("normalizes a response for the explicitly requested block", () => {
    expect(parseStandardizedSnapshot(fixture, "source-a", 19000000)).toMatchObject({
      source: "graph",
      deploymentLabel: "source-a",
      block: { number: 19000000 },
    });
  });

  it.each(["schemaVersion", "subgraphVersion", "methodologyVersion"] as const)(
    "rejects a missing %s",
    (field) => {
      const protocol = { ...fixture.protocol };
      delete protocol[field];
      expect(() => parseStandardizedSnapshot({ ...fixture, protocol }, "source-a", 19000000)).toThrow(field);
    },
  );

  it("rejects mismatched token and balance arrays", () => {
    const pools = [{ ...fixture.pools[0], inputTokenBalances: ["123"] }];
    expect(() => parseStandardizedSnapshot({ ...fixture, pools }, "source-a", 19000000)).toThrow("same length");
  });

  it.each(["1.2", "1e6", "-2"])("rejects non-integer reserve %s", (reserve) => {
    const pools = [{ ...fixture.pools[0], inputTokenBalances: [reserve, "456"] }];
    expect(() => parseStandardizedSnapshot({ ...fixture, pools }, "source-a", 19000000)).toThrow("integer");
  });

  it("rejects a response from a different block", () => {
    expect(() => parseStandardizedSnapshot(fixture, "source-a", 19000001)).toThrow("requested block");
  });
});
