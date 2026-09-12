import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { createLocalClient } from "@blockterms/sdk/local";
import { createApiServer } from "./server";

const servers: Server[] = [];

async function fixture(options: { token?: string; bodyLimitBytes?: number } = {}) {
  const directory = await mkdtemp(join(tmpdir(), "blockterms-api-"));
  const server = createApiServer({
    client: createLocalClient({ storePath: join(directory, "orders.json"), environment: {} }),
    ...options,
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("API fixture did not bind.");
  return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

const request = {
  mode: "simulation",
  query: { kind: "standardized-pools", blockNumber: 16, poolLimit: 1 },
  witness: { network: "eip155:1", address: `0x${"11".repeat(20)}`, slots: ["0x0"], block: "0x10" },
  policy: {
    maxPaymentAtomic: "1000", allowedPaymentNetworks: ["hedera:testnet"],
    resourceUrl: "https://resource.example/data", deadlineMs: 5_000,
  },
};

describe("BlockTerms HTTP API", () => {
  it("serves every agent runtime endpoint over real loopback HTTP", async () => {
    const baseUrl = await fixture();
    const health = await fetch(`${baseUrl}/health`);
    const capabilities = await fetch(`${baseUrl}/v1/capabilities`);
    const submittedResponse = await fetch(`${baseUrl}/v1/orders`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request),
    });
    const submitted = await submittedResponse.json() as { id: string };
    const run = await fetch(`${baseUrl}/v1/orders/${submitted.id}/run`, { method: "POST" });
    const order = await fetch(`${baseUrl}/v1/orders/${submitted.id}`);
    const status = await fetch(`${baseUrl}/v1/orders/${submitted.id}/status`);
    const result = await fetch(`${baseUrl}/v1/orders/${submitted.id}/result`);
    const list = await fetch(`${baseUrl}/v1/orders?limit=1`);

    expect(health.status).toBe(200);
    expect(capabilities.status).toBe(200);
    expect(submittedResponse.status).toBe(201);
    expect(run.status).toBe(200);
    expect((await order.json() as { phase: string }).phase).toBe("completed");
    expect((await status.json() as { phase: string }).phase).toBe("completed");
    expect((await result.json() as { mode: string }).mode).toBe("simulation");
    expect(await list.json()).toHaveLength(1);
    expect(health.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("rejects malformed JSON, unsupported content types, and oversized bodies", async () => {
    const baseUrl = await fixture({ bodyLimitBytes: 64 });
    const malformed = await fetch(`${baseUrl}/v1/orders`, {
      method: "POST", headers: { "content-type": "application/json" }, body: "{bad",
    });
    const wrongType = await fetch(`${baseUrl}/v1/orders`, { method: "POST", body: "hello" });
    const oversized = await fetch(`${baseUrl}/v1/orders`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ value: "x".repeat(100) }),
    });

    expect(malformed.status).toBe(400);
    expect(wrongType.status).toBe(415);
    expect(oversized.status).toBe(413);
  });

  it("enforces bearer auth on /v1 routes while leaving health available", async () => {
    const baseUrl = await fixture({ token: "expected-token" });

    expect((await fetch(`${baseUrl}/health`)).status).toBe(200);
    expect((await fetch(`${baseUrl}/v1/capabilities`)).status).toBe(401);
    expect((await fetch(`${baseUrl}/v1/capabilities`, { headers: { authorization: "Bearer wrong" } })).status).toBe(401);
    expect((await fetch(`${baseUrl}/v1/capabilities`, { headers: { authorization: "Bearer expected-token" } })).status).toBe(200);
  });

  it("returns stable not-found and method responses and closes gracefully", async () => {
    const baseUrl = await fixture();
    const missing = await fetch(`${baseUrl}/v1/orders/00000000-0000-4000-8000-000000000099`);
    const method = await fetch(`${baseUrl}/v1/capabilities`, { method: "DELETE" });

    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({ error: { code: "NOT_FOUND", retryable: false } });
    expect(method.status).toBe(405);
    expect(method.headers.get("allow")).toBe("GET");
    const server = servers.pop();
    await expect(new Promise<void>((resolve, reject) => server?.close((error) => error ? reject(error) : resolve()))).resolves.toBeUndefined();
  });
});
