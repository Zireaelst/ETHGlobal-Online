import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { DemoConsole } from "@/features/demo/demo-console";
import { productBySlug } from "@/features/marketplace/catalog";

export const metadata: Metadata = { title: "Simulation Demo" };

export default async function DemoPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const selectedProduct = productBySlug((await searchParams).product ?? "");
  return (
    <PageShell action={false} eyebrow="Buyer console" title="Inspect the lifecycle before anything goes live." intro="Compare bounded quotes, follow distinct payment and proof states, and see where deterministic policy stops the agent.">
      <DemoConsole {...(selectedProduct ? { selectedProduct } : {})} />
    </PageShell>
  );
}
