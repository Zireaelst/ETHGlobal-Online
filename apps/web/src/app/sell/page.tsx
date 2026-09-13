import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { SellerStudio } from "@/features/marketplace/seller-studio";

export const metadata: Metadata = { title: "Seller Studio" };

export default function SellPage() {
  return <PageShell eyebrow="Seller studio" title="Publish a promise agents can test." intro="Human, agent and organization providers submit the same machine-readable passport. Drafts become active only after schema, sandbox, collateral and curator gates."><SellerStudio /></PageShell>;
}
