import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { BlockTermsError, parseOrderRecord, type OrderRecord } from "@blockterms/contracts";

interface StoreFile {
  version: 1;
  orders: OrderRecord[];
}

export interface OrderRepository {
  create(order: OrderRecord): Promise<OrderRecord>;
  get(id: string): Promise<OrderRecord | undefined>;
  list(): Promise<OrderRecord[]>;
  update(id: string, expectedRevision: number, mutate: (current: OrderRecord) => OrderRecord): Promise<OrderRecord>;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function parseStoreFile(value: unknown): StoreFile {
  if (!value || typeof value !== "object" || (value as { version?: unknown }).version !== 1) {
    throw new Error("unsupported store format");
  }
  const orders = (value as { orders?: unknown }).orders;
  if (!Array.isArray(orders)) throw new Error("orders must be an array");
  const parsed = orders.map(parseOrderRecord);
  if (new Set(parsed.map((order) => order.id)).size !== parsed.length) throw new Error("duplicate order identifiers");
  return { version: 1, orders: parsed };
}

export class JsonFileOrderRepository implements OrderRepository {
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly path: string) {}

  create(order: OrderRecord): Promise<OrderRecord> {
    return this.serialized(async () => {
      const store = await this.read();
      if (store.orders.some((existing) => existing.id === order.id)) {
        throw new BlockTermsError("CONFLICT", `Order ${order.id} already exists.`);
      }
      const parsed = parseOrderRecord(order);
      store.orders.push(parsed);
      await this.write(store);
      return clone(parsed);
    });
  }

  get(id: string): Promise<OrderRecord | undefined> {
    return this.serialized(async () => {
      const found = (await this.read()).orders.find((order) => order.id === id);
      return found ? clone(found) : undefined;
    });
  }

  list(): Promise<OrderRecord[]> {
    return this.serialized(async () => {
      const orders = [...(await this.read()).orders].sort(
        (left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
      );
      return clone(orders);
    });
  }

  update(id: string, expectedRevision: number, mutate: (current: OrderRecord) => OrderRecord): Promise<OrderRecord> {
    return this.serialized(async () => {
      const store = await this.read();
      const index = store.orders.findIndex((order) => order.id === id);
      if (index < 0) throw new BlockTermsError("NOT_FOUND", `Order ${id} was not found.`);
      const current = store.orders[index];
      if (!current) throw new BlockTermsError("INTERNAL_ERROR", `Order ${id} could not be loaded.`);
      if (current.revision !== expectedRevision) {
        throw new BlockTermsError(
          "CONFLICT",
          `Order ${id} revision conflict: expected ${expectedRevision}, found ${current.revision}.`,
          { retryable: true },
        );
      }
      const candidate = mutate(clone(current));
      const next = parseOrderRecord({ ...candidate, id: current.id, revision: current.revision + 1 });
      store.orders[index] = next;
      await this.write(store);
      return clone(next);
    });
  }

  private serialized<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.catch(() => undefined).then(operation);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }

  private async read(): Promise<StoreFile> {
    try {
      const source = await readFile(this.path, "utf8");
      return parseStoreFile(JSON.parse(source));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: 1, orders: [] };
      if (error instanceof BlockTermsError) throw error;
      throw new BlockTermsError("INTERNAL_ERROR", "Order store is corrupt or unreadable.");
    }
  }

  private async write(store: StoreFile): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const temporaryPath = `${this.path}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporaryPath, `${JSON.stringify(store, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
      await rename(temporaryPath, this.path);
    } finally {
      await rm(temporaryPath, { force: true });
    }
  }
}
