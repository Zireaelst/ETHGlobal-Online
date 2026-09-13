"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { parseSimulationOrders, simulationOrderStorageKey } from "./order-store";

const subscribe = () => () => undefined;

export function OrderDetail({ orderId }: { orderId: string }) {
  const serialized = useSyncExternalStore(subscribe, () => window.localStorage.getItem(simulationOrderStorageKey), () => null);
  const order = parseSimulationOrders(serialized).find((entry) => entry.id === orderId);
  if (!order) return <div className="order-empty"><span className="app-kicker">Order not found</span><h2>This order is not in this browser.</h2><p>Simulation orders use local browser storage. Create a new order or use the CLI/API for a durable filesystem-backed record.</p><Link className="button button--primary" href="/app/orders/new">Create order</Link></div>;
  const steps = ["Terms locked", "Payment simulated", "Delivery received", "Proof validated", "Order completed"];
  return <div className="order-detail-grid"><section className="order-summary"><div className="simulation-banner"><strong>Simulation</strong><span>Educational receipt · no funds or chain evidence</span></div><div className="order-title"><div><span className="app-kicker">Order {order.id}</span><h2>{order.productName}</h2></div><span className="order-status">{order.status}</span></div><dl className="passport-list"><div><dt>Version</dt><dd>{order.productVersion}</dd></div><div><dt>Provider</dt><dd>{order.providerName}</dd></div><div><dt>Price</dt><dd>{order.priceAtomic} {order.asset}</dd></div><div><dt>Payment network</dt><dd>{order.paymentNetwork}</dd></div><div><dt>Terms digest</dt><dd className="mono-value">{order.termsHash}</dd></div><div><dt>Receipt</dt><dd>{order.receiptId ?? "Not settled"}</dd></div></dl>{order.result ? <div className="result-view"><div><span className="app-kicker">Structured result</span><strong>Accepted</strong></div><pre><code>{JSON.stringify(order.result, null, 2)}</code></pre></div> : null}</section><aside className="order-progress"><span className="app-kicker">Lifecycle</span><h2>Delivery timeline</h2><ol>{steps.map((step, index) => <li className={order.status === "completed" || index === 0 ? "is-complete" : ""} key={step}><span>{index + 1}</span><div><strong>{step}</strong><small>{order.status === "completed" || index === 0 ? "Recorded" : "Pending"}</small></div></li>)}</ol><p>Original payment and any warranty receipt remain separate records.</p></aside></div>;
}
