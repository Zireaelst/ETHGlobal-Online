import type { Metadata } from "next";
import Link from "next/link";
import { marketplaceProviders } from "@/features/marketplace/catalog";

export const metadata: Metadata = { title: "Providers" };

export default function ProvidersPage() {
  return <div className="app-page"><header className="app-page-header"><div><span className="app-kicker">Provider network</span><h1>Know who stands behind the data.</h1><p>Compare declared identity, collateral posture, products, and objective delivery outcomes. Live and simulation history stay separate.</p></div><Link className="button button--primary" href="/app/sell">Become a provider ↗</Link></header><section className="app-provider-grid">{marketplaceProviders.map((provider) => <Link href={`/app/providers/${provider.id}`} key={provider.id}><span>{provider.type}</span><h2>{provider.name}</h2><dl><div><dt>Live orders</dt><dd>{provider.liveOrders}</dd></div><div><dt>Simulation runs</dt><dd>{provider.simulationOrders}</dd></div><div><dt>Collateral</dt><dd>{provider.collateral}</dd></div></dl><strong>View provider →</strong></Link>)}</section></div>;
}
