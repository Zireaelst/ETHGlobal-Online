import Link from "next/link";
import { marketplaceProducts, marketplaceProviders } from "./catalog";

export function ProviderProfile({ providerId }: { providerId: string }) {
  const provider = marketplaceProviders.find((entry) => entry.id === providerId);
  if (!provider) return null;
  const products = marketplaceProducts.filter((product) => product.provider.id === providerId);
  return (
    <div className="provider-profile">
      <div className="market-notice"><span>Example performance</span><p>Simulation counts are separated from live orders. No live history is claimed.</p></div>
      <section className="provider-metrics"><article><span>Live paid orders</span><strong>{provider.liveOrders}</strong></article><article><span>Simulation runs</span><strong>{provider.simulationOrders}</strong></article><article><span>Verified rate</span><strong>{provider.validRate}</strong></article><article><span>Collateral</span><strong>{provider.collateral}</strong></article></section>
      <section className="provider-products"><span className="eyebrow">Active example products</span>{products.map((product) => <Link href={`/app/marketplace/${product.manifest.slug}`} key={product.id}><strong>{product.manifest.name}</strong><span>{product.manifest.kind} · {product.manifest.commercial.collateralCoverageBps / 100}% coverage</span></Link>)}</section>
      <aside className="credential-note"><strong>Credential boundary</strong><p>{provider.credentials}. Credentials affect eligibility; only finalized order evidence affects delivery performance.</p></aside>
    </div>
  );
}
