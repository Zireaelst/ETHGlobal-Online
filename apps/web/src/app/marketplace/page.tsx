import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { marketplaceProducts } from "@/features/marketplace/catalog";
import { MarketplaceGrid } from "@/features/marketplace/marketplace-grid";

export const metadata: Metadata = { title: "Marketplace" };

export default function MarketplacePage() {
  return <PageShell eyebrow="Verified data marketplace" title="Data products agents can inspect before they buy." intro="Compare explicit schema, freshness, proof scope, price and collateral. Humans and agents use the same curated market and the same order lifecycle."><MarketplaceGrid products={marketplaceProducts} /></PageShell>;
}
