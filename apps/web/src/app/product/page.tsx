import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Product" };

export default function ProductPage() {
  return (
    <PageShell eyebrow="Product" title="An enforceable data purchase, not another opaque API call." intro="BlockTerms binds the quote, payment, delivery deadline and bounded proof scope into one auditable order lifecycle.">
      <section className="feature-grid" aria-label="Product capabilities">
        <article><span className="index">01</span><h2>Scope before spend</h2><p>The buyer selects an allowlisted deployment, exact fields, maximum age, deadline and budget before any payment can begin.</p></article>
        <article><span className="index">02</span><h2>Receipts stay distinct</h2><p>The x402 payment buys the response. A warranty, if owed, is a new transfer from collateral reserved for that order.</p></article>
        <article><span className="index">03</span><h2>Evidence over optimism</h2><p>Terminal states come from checked receipts and proofs—not a successful button click or an HTTP 200 response.</p></article>
      </section>
    </PageShell>
  );
}
