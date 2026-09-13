import type { Metadata } from "next";
import Link from "next/link";
import { marketplaceProducts, productBySlug } from "@/features/marketplace/catalog";
import { PurchaseFlow } from "@/features/orders/purchase-flow";

export const metadata: Metadata = { title: "New Order" };
export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) { const selected = productBySlug((await searchParams).product ?? "") ?? marketplaceProducts[0]; if (!selected) throw new Error("Marketplace catalog is empty."); return <div className="app-page"><Link className="app-backlink" href="/app/marketplace">← Choose another product</Link><header className="app-page-header"><div><span className="app-kicker">New data order</span><h1>Lock the terms before you buy.</h1><p>Review the exact product version, provider, budget, delivery boundary, and access conditions.</p></div></header><PurchaseFlow product={selected} /></div>; }
