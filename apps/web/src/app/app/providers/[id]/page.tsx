import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { marketplaceProviders } from "@/features/marketplace/catalog";
import { ProviderProfile } from "@/features/marketplace/provider-profile";

export function generateStaticParams() { return marketplaceProviders.map((provider) => ({ id: provider.id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> { const { id } = await params; const provider = marketplaceProviders.find((entry) => entry.id === id); return { title: provider?.name ?? "Provider" }; }

export default async function ProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id; const provider = marketplaceProviders.find((entry) => entry.id === id); if (!provider) notFound();
  return <div className="app-page"><Link className="app-backlink" href="/app/providers">← Providers</Link><header className="app-page-header"><div><span className="app-kicker">{provider.type} provider</span><h1>{provider.name}</h1><p>Objective delivery history derives from finalized BlockTerms outcomes. Simulation remains visible and separate.</p></div></header><ProviderProfile providerId={id} /></div>;
}
