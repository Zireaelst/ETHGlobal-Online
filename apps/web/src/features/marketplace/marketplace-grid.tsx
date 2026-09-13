"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DataProduct } from "@blockterms/contracts";

export function MarketplaceGrid({ products }: { products: DataProduct[] }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const visible = useMemo(() => products.filter((product) => {
    const matchesQuery = [product.manifest.name, product.manifest.summary, product.provider.displayName, ...product.manifest.tags].join(" ").toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (kind === "all" || product.manifest.kind === kind);
  }), [products, query, kind]);

  return (
    <section className="market-shell" aria-label="Example data product catalog">
      <div className="market-notice"><span>Example catalog</span><p>Product passports and performance below are interface fixtures. They are not live listings or transaction evidence.</p></div>
      <div className="market-toolbar">
        <label>Search marketplace<input aria-label="Search marketplace" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Product, provider, schema…" /></label>
        <label>Product kind<select aria-label="Product kind" value={kind} onChange={(event) => setKind(event.target.value)}><option value="all">All products</option><option value="snapshot">Snapshots</option><option value="report">Reports</option><option value="bundle">Bundles</option></select></label>
      </div>
      <div className="market-grid">
        {visible.map((product) => (
          <article className="product-card" key={product.id}>
            <div className="product-card__top"><span>{product.manifest.kind}</span><span>{product.provider.type}</span></div>
            <h2>{product.manifest.name}</h2><p>{product.manifest.summary}</p>
            <dl><div><dt>Provider</dt><dd>{product.provider.displayName}</dd></div><div><dt>Freshness</dt><dd>≤ {product.manifest.freshnessSeconds}s</dd></div><div><dt>Coverage</dt><dd>{product.manifest.commercial.collateralCoverageBps / 100}%</dd></div><div><dt>Price</dt><dd>{product.manifest.commercial.priceAtomic} atomic</dd></div></dl>
            <Link href={`/marketplace/${product.manifest.slug}`}>Inspect product passport <span aria-hidden="true">↗</span></Link>
          </article>
        ))}
      </div>
      {visible.length === 0 ? <p className="market-empty">No example product matches these filters.</p> : null}
    </section>
  );
}
