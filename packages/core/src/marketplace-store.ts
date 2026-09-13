import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  BlockTermsError,
  parseDataProduct,
  parseProviderProfile,
  type DataProduct,
  type ProviderProfile,
} from "@blockterms/contracts";

interface MarketplaceStoreFile {
  version: 1;
  products: DataProduct[];
  providers: ProviderProfile[];
}

export interface MarketplaceRepository {
  createProduct(product: DataProduct): Promise<DataProduct>;
  getProduct(idOrSlug: string): Promise<DataProduct | undefined>;
  listProducts(): Promise<DataProduct[]>;
  updateProduct(id: string, expectedRevision: number, mutate: (current: DataProduct) => DataProduct): Promise<DataProduct>;
  getProvider(id: string): Promise<ProviderProfile | undefined>;
  listProviders(): Promise<ProviderProfile[]>;
  putProvider(profile: ProviderProfile): Promise<ProviderProfile>;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function parseStoreFile(value: unknown): MarketplaceStoreFile {
  if (!value || typeof value !== "object" || (value as { version?: unknown }).version !== 1) throw new Error("unsupported store format");
  const products = (value as { products?: unknown }).products;
  const providers = (value as { providers?: unknown }).providers;
  if (!Array.isArray(products) || !Array.isArray(providers)) throw new Error("catalog collections must be arrays");
  const parsedProducts = products.map(parseDataProduct);
  const parsedProviders = providers.map(parseProviderProfile);
  if (new Set(parsedProducts.map((product) => product.id)).size !== parsedProducts.length) throw new Error("duplicate product identifiers");
  if (new Set(parsedProducts.map((product) => product.manifest.slug)).size !== parsedProducts.length) throw new Error("duplicate product slugs");
  if (new Set(parsedProviders.map((profile) => profile.provider.id)).size !== parsedProviders.length) throw new Error("duplicate provider identifiers");
  return { version: 1, products: parsedProducts, providers: parsedProviders };
}

export class JsonFileMarketplaceRepository implements MarketplaceRepository {
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly path: string) {}

  createProduct(product: DataProduct): Promise<DataProduct> {
    return this.serialized(async () => {
      const store = await this.read();
      if (store.products.some((entry) => entry.id === product.id)) throw new BlockTermsError("CONFLICT", `Product ${product.id} already exists.`);
      if (store.products.some((entry) => entry.manifest.slug === product.manifest.slug)) throw new BlockTermsError("CONFLICT", `Product slug ${product.manifest.slug} already exists.`);
      const parsed = parseDataProduct(product);
      store.products.push(parsed);
      await this.write(store);
      return clone(parsed);
    });
  }

  getProduct(idOrSlug: string): Promise<DataProduct | undefined> {
    return this.serialized(async () => {
      const found = (await this.read()).products.find((product) => product.id === idOrSlug || product.manifest.slug === idOrSlug);
      return found ? clone(found) : undefined;
    });
  }

  listProducts(): Promise<DataProduct[]> {
    return this.serialized(async () => clone([...(await this.read()).products].sort(
      (left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id),
    )));
  }

  updateProduct(id: string, expectedRevision: number, mutate: (current: DataProduct) => DataProduct): Promise<DataProduct> {
    return this.serialized(async () => {
      const store = await this.read();
      const index = store.products.findIndex((product) => product.id === id);
      if (index < 0) throw new BlockTermsError("NOT_FOUND", `Product ${id} was not found.`);
      const current = store.products[index];
      if (!current) throw new BlockTermsError("INTERNAL_ERROR", `Product ${id} could not be loaded.`);
      if (current.revision !== expectedRevision) throw new BlockTermsError("CONFLICT", `Product ${id} revision conflict.`, { retryable: true });
      const next = parseDataProduct({ ...mutate(clone(current)), id: current.id, revision: current.revision + 1 });
      if (store.products.some((entry, entryIndex) => entryIndex !== index && entry.manifest.slug === next.manifest.slug)) {
        throw new BlockTermsError("CONFLICT", `Product slug ${next.manifest.slug} already exists.`);
      }
      store.products[index] = next;
      await this.write(store);
      return clone(next);
    });
  }

  getProvider(id: string): Promise<ProviderProfile | undefined> {
    return this.serialized(async () => {
      const found = (await this.read()).providers.find((profile) => profile.provider.id === id);
      return found ? clone(found) : undefined;
    });
  }

  listProviders(): Promise<ProviderProfile[]> {
    return this.serialized(async () => clone([...(await this.read()).providers].sort(
      (left, right) => left.provider.displayName.localeCompare(right.provider.displayName),
    )));
  }

  putProvider(profile: ProviderProfile): Promise<ProviderProfile> {
    return this.serialized(async () => {
      const parsed = parseProviderProfile(profile);
      const store = await this.read();
      const index = store.providers.findIndex((entry) => entry.provider.id === parsed.provider.id);
      if (index < 0) store.providers.push(parsed); else store.providers[index] = parsed;
      await this.write(store);
      return clone(parsed);
    });
  }

  private serialized<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.catch(() => undefined).then(operation);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }

  private async read(): Promise<MarketplaceStoreFile> {
    try {
      return parseStoreFile(JSON.parse(await readFile(this.path, "utf8")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: 1, products: [], providers: [] };
      if (error instanceof BlockTermsError) throw error;
      throw new BlockTermsError("INTERNAL_ERROR", "Marketplace store is corrupt or unreadable.");
    }
  }

  private async write(store: MarketplaceStoreFile): Promise<void> {
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
