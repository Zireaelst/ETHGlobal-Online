import type { Metadata } from "next";
import { marketplaceProducts } from "@/features/marketplace/catalog";
import { MarketplaceGrid } from "@/features/marketplace/marketplace-grid";

export const metadata: Metadata = { title: "Marketplace" };

export default function MarketplacePage() {
  return <div className="app-page"><header className="app-page-header"><div><span className="app-kicker">Verified data marketplace</span><h1>Find data with terms attached.</h1><p>Compare schema, freshness, proof scope, price, provider, and collateral before an order starts.</p></div></header><MarketplaceGrid products={marketplaceProducts} /></div>;
}
