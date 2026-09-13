import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { marketplaceProducts, productBySlug } from "@/features/marketplace/catalog";
import { ProductPassport } from "@/features/marketplace/product-passport";

export function generateStaticParams() { return marketplaceProducts.map((product) => ({ slug: product.manifest.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = productBySlug((await params).slug); return { title: product?.manifest.name ?? "Product" };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = productBySlug((await params).slug); if (!product) notFound();
  return <PageShell eyebrow={`${product.manifest.kind} · v${product.manifest.version}`} title={product.manifest.name} intro={product.manifest.summary}><ProductPassport product={product} /></PageShell>;
}
