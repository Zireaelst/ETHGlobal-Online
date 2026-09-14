"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { parseSimulationOrders, simulationOrderStorageKey } from "./order-store";

const subscribe = () => () => undefined;

export function OrderList() {
  const serialized = useSyncExternalStore(subscribe, () => window.localStorage.getItem(simulationOrderStorageKey), () => null);
  const orders = parseSimulationOrders(serialized).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (orders.length === 0) return <div className="order-empty"><span className="app-kicker">No local orders</span><h2>Start with a marketplace product.</h2><p>Your browser simulation orders will appear here with their pinned terms and results.</p><Link className="button button--primary" href="/app/marketplace">Browse marketplace</Link></div>;
  return <section className="orders-list">{orders.map((order) => <Link href={`/app/orders/${order.id}`} key={order.id}><div><span>{order.profile}</span><strong>{order.status}</strong></div><h2>{order.productName}</h2><p>{order.providerName} · v{order.productVersion}</p><dl><div><dt>Order</dt><dd>{order.id}</dd></div><div><dt>Price</dt><dd>{order.priceAtomic} {order.asset}</dd></div><div><dt>Updated</dt><dd>{new Date(order.updatedAt).toLocaleString()}</dd></div></dl></Link>)}</section>;
}
