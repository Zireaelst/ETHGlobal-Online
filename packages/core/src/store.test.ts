import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { OrderRecord } from "@blockterms/contracts";
import { describe, expect, it } from "vitest";
import { JsonFileOrderRepository } from "./store";

function order(id: string, createdAt = "2026-09-12T12:00:00.000Z"): OrderRecord {
  return {
    id,
    createdAt,
    updatedAt: createdAt,
    revision: 0,
    phase: "queued",
    requestedMode: "simulation",
    fallbackReasons: [],
    request: {
      mode: "simulation",
      query: { kind: "standardized-pools", blockNumber: 16, poolLimit: 3 },
      witness: { network: "eip155:1", address: `0x${"11".repeat(20)}`, slots: ["0x0"], block: "0x10" },
      policy: {
        maxPaymentAtomic: "1000",
        allowedPaymentNetworks: ["hedera:testnet"],
        resourceUrl: "https://resource.example/data",
        deadlineMs: 10_000,
      },
    },
    protocolState: { kind: "quoted", orderId: id, mode: "simulation" },
    events: [],
  };
}

async function storePath(): Promise<string> {
  return join(await mkdtemp(join(tmpdir(), "blockterms-store-")), "orders.json");
}

describe("JsonFileOrderRepository", () => {
  it("persists records across repository instances", async () => {
    const path = await storePath();
    const expected = order("00000000-0000-4000-8000-000000000001");
    await new JsonFileOrderRepository(path).create(expected);

    await expect(new JsonFileOrderRepository(path).get(expected.id)).resolves.toEqual(expected);
  });

  it("returns undefined for a missing record", async () => {
    await expect(new JsonFileOrderRepository(await storePath()).get("00000000-0000-4000-8000-000000000099")).resolves.toBeUndefined();
  });

  it("rejects corrupt storage instead of discarding it", async () => {
    const path = await storePath();
    await writeFile(path, "{ definitely-not-json", "utf8");

    await expect(new JsonFileOrderRepository(path).list()).rejects.toThrow(/corrupt/i);
  });

  it("serializes concurrent writes without losing records", async () => {
    const path = await storePath();
    const repository = new JsonFileOrderRepository(path);
    const records = Array.from({ length: 12 }, (_, index) =>
      order(`00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
    );

    await Promise.all(records.map((record) => repository.create(record)));

    await expect(repository.list()).resolves.toHaveLength(records.length);
    expect(JSON.parse(await readFile(path, "utf8"))).toMatchObject({ version: 1 });
  });

  it("uses compare-and-set revisions for updates", async () => {
    const path = await storePath();
    const repository = new JsonFileOrderRepository(path);
    const initial = order("00000000-0000-4000-8000-000000000001");
    await repository.create(initial);

    const updated = await repository.update(initial.id, 0, (current) => ({
      ...current,
      phase: "running",
      selectedMode: "simulation",
      protocolState: { kind: "reserved", orderId: current.id, mode: "simulation" },
    }));

    expect(updated.revision).toBe(1);
    await expect(repository.update(initial.id, 0, (current) => current)).rejects.toThrow(/revision/i);
  });
});
