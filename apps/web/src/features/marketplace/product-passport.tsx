import type { DataProduct } from "@blockterms/contracts";
import Link from "next/link";

export function ProductPassport({ product }: { product: DataProduct }) {
  return (
    <div className="passport-layout">
      <section className="passport-card">
        <div className="passport-state"><span>Example catalog record</span><strong>{product.state}</strong></div>
        <h2>Data Product Passport</h2>
        <dl className="passport-list">
          <div><dt>Provider</dt><dd>{product.provider.displayName} · {product.provider.type}</dd></div>
          <div><dt>Schema</dt><dd>{product.manifest.schema.family}@{product.manifest.schema.version}</dd></div>
          <div><dt>Networks</dt><dd>{product.manifest.networks.join(", ")}</dd></div>
          <div><dt>Freshness / delivery</dt><dd>{product.manifest.freshnessSeconds}s / {product.manifest.deliverySeconds}s</dd></div>
          <div><dt>Price</dt><dd>{product.manifest.commercial.priceAtomic} {product.manifest.commercial.asset} atomic units</dd></div>
          <div><dt>Warranty coverage</dt><dd>{product.manifest.commercial.collateralCoverageBps / 100}%</dd></div>
          <div><dt>Proof profile</dt><dd>{product.manifest.verification.profile}</dd></div>
          <div><dt>Sample digest</dt><dd className="mono-value">{product.manifest.sample.digest}</dd></div>
        </dl>
        <Link className="passport-purchase" href={`/demo?product=${product.manifest.slug}`}>
          Prepare example purchase <span aria-hidden="true">→</span>
        </Link>
      </section>
      <aside className="passport-aside">
        <section><span className="eyebrow">Warranty boundary</span><h2>Payment stays final.</h2><p>An invalid or late provider-bound delivery can authorize a separate collateral transfer. The purchase is not reversed.</p></section>
        <section><span className="eyebrow">Credentials</span><h2>Eligibility, not correctness.</h2><p>A provider credential is an eligibility signal. It does not prove freshness, completeness, ownership, or delivery correctness.</p>{product.manifest.credentials.map((credential) => <small key={credential.reference}>{credential.kind} · {credential.issuer} · expires {credential.expiresAt.slice(0, 10)}</small>)}</section>
        {product.composition ? <section><span className="eyebrow">Bundle lineage</span><h2>{product.composition.method}</h2><ol>{product.composition.components.map((component) => <li key={component.productId}>{component.outputAlias} · v{component.version}</li>)}</ol></section> : null}
      </aside>
    </div>
  );
}
