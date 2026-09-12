import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { EvmWitnessAdapter } from "./witness";

type RpcRequest = { id: number; method: string; params: unknown[] };
const servers: Server[] = [];
const address = `0x${"12".repeat(20)}`;

function proof(overrides: Record<string, unknown> = {}) {
  return {
    address,
    accountProof: ["0x1234", "0xabcd"],
    balance: "0x0",
    codeHash: `0x${"34".repeat(32)}`,
    nonce: "0x0",
    storageHash: `0x${"56".repeat(32)}`,
    storageProof: [
      { key: "0x0", value: "0x7", proof: ["0x123456"] },
      { key: "0x2", value: "0x9", proof: ["0xabcdef"] },
    ],
    ...overrides,
  };
}

async function rpcServer(
  responder: (request: RpcRequest) => Record<string, unknown>,
  delayMs = 0,
): Promise<{ url: string; requests: RpcRequest[] }> {
  const requests: RpcRequest[] = [];
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as RpcRequest;
      requests.push(body);
      setTimeout(() => {
        if (response.destroyed) return;
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ jsonrpc: "2.0", id: body.id, ...responder(body) }));
      }, delayMs);
    });
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const bound = server.address();
  if (!bound || typeof bound === "string") throw new Error("RPC fixture did not bind.");
  return { url: `http://127.0.0.1:${bound.port}`, requests };
}

function standardResponder(request: RpcRequest): Record<string, unknown> {
  if (request.method === "eth_getProof") return { result: proof() };
  return { result: { number: "0x10", hash: `0x${"78".repeat(32)}`, stateRoot: `0x${"90".repeat(32)}` } };
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

describe("EvmWitnessAdapter", () => {
  it("fetches an exact bounded proof and pinned header", async () => {
    const fixture = await rpcServer(standardResponder);
    const adapter = new EvmWitnessAdapter({ rpcUrl: fixture.url, timeoutMs: 1_000 });

    const result = await adapter.fetch(
      { network: "eip155:1", address, slots: ["0x0", "0x2"], block: "0x10" },
      { orderId: "order-1", signal: new AbortController().signal },
    );

    expect(fixture.requests.map((request) => [request.method, request.params])).toEqual([
      ["eth_getProof", [address, ["0x0", "0x2"], "0x10"]],
      ["eth_getBlockByNumber", ["0x10", false]],
    ]);
    expect(result).toMatchObject({ address, blockNumber: 16, slotCount: 2, storageValues: { "0x0": "0x7", "0x2": "0x9" } });
    expect(result.accountProofBytes).toBe(4);
    expect(result.storageProofBytes).toBe(6);
  });

  it("rejects an account mismatch", async () => {
    const fixture = await rpcServer((request) => request.method === "eth_getProof"
      ? { result: proof({ address: `0x${"99".repeat(20)}` }) }
      : standardResponder(request));
    await expect(new EvmWitnessAdapter({ rpcUrl: fixture.url }).fetch(
      { network: "eip155:1", address, slots: ["0x0", "0x2"], block: "0x10" },
      { orderId: "order-1", signal: new AbortController().signal },
    )).rejects.toThrow(/account/i);
  });

  it("rejects missing or additional storage slots", async () => {
    const fixture = await rpcServer((request) => request.method === "eth_getProof"
      ? { result: proof({ storageProof: [{ key: "0x0", value: "0x7", proof: ["0x12"] }] }) }
      : standardResponder(request));
    await expect(new EvmWitnessAdapter({ rpcUrl: fixture.url }).fetch(
      { network: "eip155:1", address, slots: ["0x0", "0x2"], block: "0x10" },
      { orderId: "order-1", signal: new AbortController().signal },
    )).rejects.toThrow(/exact requested slot set/i);
  });

  it("rejects a header from another block and malformed proof nodes", async () => {
    const wrongBlock = await rpcServer((request) => request.method === "eth_getProof"
      ? { result: proof() }
      : { result: { number: "0x11", hash: "0x12", stateRoot: "0x34" } });
    await expect(new EvmWitnessAdapter({ rpcUrl: wrongBlock.url }).fetch(
      { network: "eip155:1", address, slots: ["0x0", "0x2"], block: "0x10" },
      { orderId: "order-1", signal: new AbortController().signal },
    )).rejects.toThrow(/pinned block/i);

    const malformed = await rpcServer((request) => request.method === "eth_getProof"
      ? { result: proof({ accountProof: ["0x123"] }) }
      : standardResponder(request));
    await expect(new EvmWitnessAdapter({ rpcUrl: malformed.url }).fetch(
      { network: "eip155:1", address, slots: ["0x0", "0x2"], block: "0x10" },
      { orderId: "order-1", signal: new AbortController().signal },
    )).rejects.toThrow(/proof node/i);
  });

  it("sanitizes JSON-RPC errors", async () => {
    const fixture = await rpcServer(() => ({ error: { code: -32000, message: "secret upstream detail" } }));
    const promise = new EvmWitnessAdapter({ rpcUrl: fixture.url }).fetch(
      { network: "eip155:1", address, slots: ["0x0"], block: "0x10" },
      { orderId: "order-1", signal: new AbortController().signal },
    );
    await expect(promise).rejects.toThrow(/JSON-RPC error/i);
    await expect(promise).rejects.not.toThrow(/secret upstream detail/i);
  });

  it("enforces its request timeout", async () => {
    const fixture = await rpcServer(standardResponder, 100);
    await expect(new EvmWitnessAdapter({ rpcUrl: fixture.url, timeoutMs: 20 }).fetch(
      { network: "eip155:1", address, slots: ["0x0", "0x2"], block: "0x10" },
      { orderId: "order-1", signal: new AbortController().signal },
    )).rejects.toThrow(/timed out/i);
  });
});
