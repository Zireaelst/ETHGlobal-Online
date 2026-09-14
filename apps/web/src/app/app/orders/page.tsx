import type { Metadata } from "next";
import Link from "next/link";
import { OrderList } from "@/features/orders/order-list";

export const metadata: Metadata = { title: "Orders" };
export default function OrdersPage() { return <div className="app-page"><header className="app-page-header"><div><span className="app-kicker">Procurement ledger</span><h1>Every order keeps its terms.</h1><p>Follow payment, delivery, verification, and result state without losing the version or provider you approved.</p></div><Link className="button button--primary" href="/app/orders/new">New order +</Link></header><OrderList /></div>; }
