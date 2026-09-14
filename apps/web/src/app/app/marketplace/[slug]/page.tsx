import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { marketplaceProducts, productBySlug } from "@/features/marketplace/catalog";
import { ProductPassport } from "@/features/marketplace/product-passport";

export function generateStaticParams() { return marketplaceProducts.map((product) => ({ slug: product.manifest.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const product = productBySlug((await params).slug); return { title: product?.manifest.name ?? "Product" }; }

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = productBySlug((await params).slug); if (!product) notFound();
  return <div className="app-page"><Link className="app-backlink" href="/app/marketplace">← Marketplace</Link><header className="app-page-header"><div><span className="app-kicker">{product.manifest.kind} · v{product.manifest.version}</span><h1>{product.manifest.name}</h1><p>{product.manifest.summary}</p></div></header><ProductPassport product={product} /></div>;
}
