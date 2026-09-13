import type { DataProduct } from "@blockterms/contracts";

export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; }
export type SimulationOrderStatus = "quoted" | "completed";
export interface SimulationOrder {
  id: string;
  profile: "simulation";
  status: SimulationOrderStatus;
  productId: string;
  productSlug: string;
  productName: string;
  productVersion: string;
  providerId: string;
  providerName: string;
  termsHash: string;
  priceAtomic: string;
  maxBudgetAtomic: string;
  paymentNetwork: string;
  asset: string;
  credentialPresented: boolean;
  createdAt: string;
  updatedAt: string;
  receiptId?: string;
  result?: { mode: "simulation"; decision: "accepted"; data: { blockNumber: number; product: string; observations: number }; evidence: "educational-only" };
}

export const simulationOrderStorageKey = "blockterms.simulation.orders.v1";

export function parseSimulationOrders(raw: string | null): SimulationOrder[] {
  if (!raw) return [];
  try { const value = JSON.parse(raw); return Array.isArray(value) ? value as SimulationOrder[] : []; } catch { return []; }
}

function safeOrders(storage: StorageLike): SimulationOrder[] {
  return parseSimulationOrders(storage.getItem(simulationOrderStorageKey));
}

export function createSimulationQuote({ product, maxBudgetAtomic, credentialPresented = false, id, now }: { product: DataProduct; maxBudgetAtomic: string; credentialPresented?: boolean; id?: string; now?: string }): SimulationOrder {
  if (!/^\d+$/.test(maxBudgetAtomic)) throw new Error("Maximum budget must be an atomic-unit integer.");
  if (BigInt(maxBudgetAtomic) < BigInt(product.manifest.commercial.priceAtomic)) throw new Error("Maximum budget is below the product price.");
  if (product.manifest.access?.visibility === "credential-gated" && !credentialPresented) throw new Error("A credential presentation is required for this product.");
  const timestamp = now ?? new Date().toISOString();
  return {
    id: id ?? `sim_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    profile: "simulation", status: "quoted", productId: product.id, productSlug: product.manifest.slug,
    productName: product.manifest.name, productVersion: product.manifest.version, providerId: product.provider.id,
    providerName: product.provider.displayName, termsHash: product.manifest.sample.digest,
    priceAtomic: product.manifest.commercial.priceAtomic, maxBudgetAtomic,
    paymentNetwork: product.manifest.commercial.paymentNetwork, asset: product.manifest.commercial.asset,
    credentialPresented, createdAt: timestamp, updatedAt: timestamp,
  };
}

export function readSimulationOrders(storage: StorageLike): SimulationOrder[] { return safeOrders(storage).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
export function readSimulationOrder(storage: StorageLike, id: string): SimulationOrder | undefined { return safeOrders(storage).find((order) => order.id === id); }

export function saveSimulationQuote(storage: StorageLike, quote: SimulationOrder): void {
  const orders = safeOrders(storage).filter((order) => order.id !== quote.id);
  storage.setItem(simulationOrderStorageKey, JSON.stringify([...orders, quote]));
}

export function purchaseSimulationOrder(storage: StorageLike, id: string, now = new Date().toISOString()): SimulationOrder {
  const orders = safeOrders(storage); const index = orders.findIndex((order) => order.id === id);
  if (index < 0) throw new Error("Simulation order was not found.");
  const current = orders[index];
  if (!current) throw new Error("Simulation order was not found.");
  if (current.status === "completed") return current;
  const completed: SimulationOrder = { ...current, status: "completed", updatedAt: now, receiptId: `sim_receipt_${current.id}`, result: { mode: "simulation", decision: "accepted", data: { blockNumber: 16, product: current.productSlug, observations: current.productSlug.includes("bundle") ? 2 : 1 }, evidence: "educational-only" } };
  orders[index] = completed; storage.setItem(simulationOrderStorageKey, JSON.stringify(orders)); return completed;
}
