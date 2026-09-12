import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { GraphStandardizedAdapter } from "./graph";

interface CapturedRequest {
  authorization?: string;
  body: { query: string; variables: { block: number; poolLimit: number } };
}

const servers: Server[] = [];

function snapshot(block: number, schemaVersion = "1.0.0", poolCount = 1) {
  return {
    data: {
      protocol: {
        id: "protocol-1",
        name: "Protocol One",
        network: "mainnet",
        schemaVersion,
        subgraphVersion: "1.0.0",
        methodologyVersion: "1.0.0",
      },
      _meta: { block: { number: block, hash: "0xabc" } },
      pools: Array.from({ length: poolCount }, (_, index) => ({
        id: `pool-${index}`,
        inputTokenIds: ["token-a", "token-b"],
        inputTokenBalances: ["100", "200"],
      })),
    },
  };
}

async function fixtureServer(response: unknown, delayMs = 0): Promise<{ url: string; requests: CapturedRequest[] }> {
  const requests: CapturedRequest[] = [];
  const server = createServer((request, responseStream) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      requests.push({
        ...(request.headers.authorization ? { authorization: request.headers.authorization } : {}),
        body: JSON.parse(Buffer.concat(chunks).toString("utf8")) as CapturedRequest["body"],
      });
      setTimeout(() => {
        if (responseStream.destroyed) return;
        responseStream.writeHead(200, { "content-type": "application/json" });
        responseStream.end(JSON.stringify(response));
      }, delayMs);
    });
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Fixture server did not bind.");
  return { url: `http://127.0.0.1:${address.port}/graphql`, requests };
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

describe("GraphStandardizedAdapter", () => {
  it("queries two deployments with one standardized shape at the same pinned block", async () => {
    const first = await fixtureServer(snapshot(19_000_000));
    const second = await fixtureServer(snapshot(19_000_000));
    const adapter = new GraphStandardizedAdapter({
      deployments: [{ endpoint: first.url, label: "a" }, { endpoint: second.url, label: "b" }],
      authorization: "Bearer top-secret",
      timeoutMs: 1_000,
    });

    const result = await adapter.fetch(
      { kind: "standardized-pools", blockNumber: 19_000_000, poolLimit: 1 },
      { orderId: "order-1", signal: new AbortController().signal },
    );

    expect(result.map((entry) => entry.deploymentLabel)).toEqual(["a", "b"]);
    expect([...first.requests, ...second.requests].map((entry) => entry.body.variables)).toEqual([
      { block: 19_000_000, poolLimit: 1 },
      { block: 19_000_000, poolLimit: 1 },
    ]);
    expect(first.requests[0]?.authorization).toBe("Bearer top-secret");
    expect(JSON.stringify(result)).not.toContain("top-secret");
  });

  it("rejects incompatible schema versions", async () => {
    const first = await fixtureServer(snapshot(10, "1.0.0"));
    const second = await fixtureServer(snapshot(10, "2.0.0"));
    const adapter = new GraphStandardizedAdapter({ deployments: [
      { endpoint: first.url, label: "a" }, { endpoint: second.url, label: "b" },
    ] });

    await expect(adapter.fetch(
      { kind: "standardized-pools", blockNumber: 10, poolLimit: 1 },
      { orderId: "order-1", signal: new AbortController().signal },
    )).rejects.toThrow(/schema versions/i);
  });

  it("rejects GraphQL errors without echoing their potentially unsafe detail", async () => {
    const first = await fixtureServer({ errors: [{ message: "Bearer leaked-upstream-detail" }] });
    const second = await fixtureServer(snapshot(10));
    const adapter = new GraphStandardizedAdapter({ deployments: [
      { endpoint: first.url, label: "a" }, { endpoint: second.url, label: "b" },
    ] });

    const promise = adapter.fetch(
      { kind: "standardized-pools", blockNumber: 10, poolLimit: 1 },
      { orderId: "order-1", signal: new AbortController().signal },
    );
    await expect(promise).rejects.toThrow("a GraphQL response included errors");
    await expect(promise).rejects.not.toThrow("leaked-upstream-detail");
  });

  it("enforces its request timeout", async () => {
    const first = await fixtureServer(snapshot(10), 100);
    const second = await fixtureServer(snapshot(10));
    const adapter = new GraphStandardizedAdapter({
      deployments: [{ endpoint: first.url, label: "a" }, { endpoint: second.url, label: "b" }],
      timeoutMs: 20,
    });

    await expect(adapter.fetch(
      { kind: "standardized-pools", blockNumber: 10, poolLimit: 1 },
      { orderId: "order-1", signal: new AbortController().signal },
    )).rejects.toThrow(/timed out/i);
  });

  it("rejects a response larger than the requested bound", async () => {
    const first = await fixtureServer(snapshot(10, "1.0.0", 2));
    const second = await fixtureServer(snapshot(10));
    const adapter = new GraphStandardizedAdapter({ deployments: [
      { endpoint: first.url, label: "a" }, { endpoint: second.url, label: "b" },
    ] });

    await expect(adapter.fetch(
      { kind: "standardized-pools", blockNumber: 10, poolLimit: 1 },
      { orderId: "order-1", signal: new AbortController().signal },
    )).rejects.toThrow(/requested pool limit/i);
  });
});
