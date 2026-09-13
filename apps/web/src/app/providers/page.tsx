import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Providers" };

export default function ProvidersPage() {
  return (
    <PageShell eyebrow="Providers" title="Sell an explicit promise, backed before purchase." intro="Providers compete on narrow quote terms and reserve real collateral against the delivery they sign.">
      <section className="provider-ledger">
        <div className="ledger-heading"><span>Provider lifecycle</span><span>Withdrawal boundary</span></div>
        <article><span className="ledger-num">01</span><div><h2>Fund collateral</h2><p>Deposit into the supported asset pool before advertising warranted capacity.</p></div><strong>Available</strong></article>
        <article><span className="ledger-num">02</span><div><h2>Sign quote terms</h2><p>Bind price, proof scope, reservation TTL, delivery deadline and warranty amount.</p></div><strong>Quoted</strong></article>
        <article><span className="ledger-num">03</span><div><h2>Reserve liability</h2><p>Lock the promised warranty amount to one buyer order while settlement is unresolved.</p></div><strong>Locked</strong></article>
        <article><span className="ledger-num">04</span><div><h2>Publish final delivery</h2><p>Make the complete bounded witness available before the signed deadline.</p></div><strong>Active</strong></article>
        <article><span className="ledger-num">05</span><div><h2>Resolve</h2><p>Release after acceptance or pay a separate warranty when objective terms fail.</p></div><strong>Terminal</strong></article>
      </section>
      <aside className="callout"><h2>Reserved means unavailable.</h2><p>Active liabilities cannot be withdrawn, reused or counted as free collateral. Provider admission is curated in the first release and disclosed as a trust boundary.</p></aside>
      <div className="docs-next"><Link href="/providers/provider-atlas">Inspect example agent profile</Link><Link href="/sell">Open seller studio</Link></div>
    </PageShell>
  );
}
