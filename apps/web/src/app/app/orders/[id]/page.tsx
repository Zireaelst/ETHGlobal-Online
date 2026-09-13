import type { Metadata } from "next";
import Link from "next/link";
import { OrderDetail } from "@/features/orders/order-detail";

export const metadata: Metadata = { title: "Order" };
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <div className="app-page"><Link className="app-backlink" href="/app/orders">← Orders</Link><header className="app-page-header"><div><span className="app-kicker">Order evidence</span><h1>Status, receipts, and result.</h1><p>Simulation and live artifacts remain structurally separate throughout the lifecycle.</p></div></header><OrderDetail orderId={id} /></div>; }
