import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { marketplaceProviders } from "@/features/marketplace/catalog";
import { ProviderProfile } from "@/features/marketplace/provider-profile";

export function generateStaticParams() { return marketplaceProviders.map((provider) => ({ id: provider.id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const provider = marketplaceProviders.find((entry) => entry.id === id);
  return { title: provider?.name ?? "Provider" };
}

export default async function ProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id; const provider = marketplaceProviders.find((entry) => entry.id === id); if (!provider) notFound();
  return <PageShell eyebrow={`${provider.type} provider`} title={provider.name} intro="Objective delivery history is derived from finalized BlockTerms outcomes. Simulation remains visible and separate."><ProviderProfile providerId={id} /></PageShell>;
}
