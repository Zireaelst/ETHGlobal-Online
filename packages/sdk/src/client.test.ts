import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { SubmitRequest } from "@blockterms/contracts";
import { createLocalClient } from "./local";

const request: SubmitRequest = {
  mode: "simulation",
  query: { kind: "standardized-pools", blockNumber: 16, poolLimit: 2 },
  witness: { network: "eip155:1", address: `0x${"11".repeat(20)}`, slots: ["0x0"], block: "0x10" },
  policy: {
    maxPaymentAtomic: "1000", allowedPaymentNetworks: ["hedera:testnet"],
    resourceUrl: "https://resource.example/data", deadlineMs: 5_000,
  },
};

describe("local BlockTerms client contract", () => {
  it("supports submit, run, retrieval, listing, health, and capabilities", async () => {
    const directory = await mkdtemp(join(tmpdir(), "blockterms-sdk-"));
    const client = createLocalClient({ storePath: join(directory, "orders.json"), environment: {} });

    const submitted = await client.submit(request);
    const completed = await client.run(submitted.id);

    await expect(client.getOrder(submitted.id)).resolves.toEqual(completed);
    await expect(client.getStatus(submitted.id)).resolves.toMatchObject({ phase: "completed" });
    await expect(client.getResult(submitted.id)).resolves.toEqual(completed.result);
    await expect(client.listOrders({ limit: 1 })).resolves.toEqual([completed]);
    await expect(client.health()).resolves.toEqual({ status: "ok", service: "blockterms", version: "0.1.0" });
    await expect(client.capabilities()).resolves.toMatchObject({
      modes: ["simulation", "live"], live: { ready: false }, interfaces: ["sdk", "http", "cli", "mcp"],
    });
  });

  it("reads an order persisted by a previous local client", async () => {
    const directory = await mkdtemp(join(tmpdir(), "blockterms-sdk-restart-"));
    const storePath = join(directory, "orders.json");
    const submitted = await createLocalClient({ storePath, environment: {} }).submit(request);

    await expect(createLocalClient({ storePath, environment: {} }).getOrder(submitted.id)).resolves.toEqual(submitted);
  });
});
