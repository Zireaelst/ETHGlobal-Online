"use client";

import type { DataProduct } from "@blockterms/contracts";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSimulationQuote, purchaseSimulationOrder, saveSimulationQuote, type SimulationOrder } from "./order-store";

export function PurchaseFlow({ product }: { product: DataProduct }) {
  const router = useRouter();
  const [budget, setBudget] = useState(product.manifest.commercial.priceAtomic);
  const [credential, setCredential] = useState(false);
  const [quote, setQuote] = useState<SimulationOrder>();
  const [error, setError] = useState("");
  const gated = product.manifest.access?.visibility === "credential-gated";

  function createQuote() {
    try { setError(""); const next = createSimulationQuote({ product, maxBudgetAtomic: budget, credentialPresented: credential }); saveSimulationQuote(window.localStorage, next); setQuote(next); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Quote could not be created."); }
  }

  function purchase() {
    if (!quote) return;
    purchaseSimulationOrder(window.localStorage, quote.id);
    router.push(`/app/orders/${quote.id}`);
  }

  return <div className="purchase-layout">
    <section className="purchase-config"><div className="simulation-banner"><strong>Simulation</strong><span>No funds, live requests, or chain evidence</span></div><span className="app-kicker">Purchase configuration</span><h2>{product.manifest.name}</h2><p>{product.manifest.summary}</p><div className="purchase-fields"><label>Product version<input readOnly value={`v${product.manifest.version}`} /></label><label>Provider<input readOnly value={product.provider.displayName} /></label><label>Maximum budget (atomic units)<input inputMode="numeric" value={budget} onChange={(event) => setBudget(event.target.value)} /></label><label>Delivery deadline<input readOnly value={`≤ ${product.manifest.deliverySeconds} seconds`} /></label><label className="wide-field">Pinned terms digest<input readOnly value={product.manifest.sample.digest} /></label>{gated ? <label className="credential-check wide-field"><input aria-label="Credential presentation" checked={credential} onChange={(event) => setCredential(event.target.checked)} type="checkbox" /><span><strong>Present eligible buyer credential</strong><small>Simulation validates the access gate only. It does not establish data correctness.</small></span></label> : null}</div>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button button--primary" disabled={gated && !credential} onClick={createQuote} type="button">Create quote</button></section>
    <aside className="quote-review"><span className="app-kicker">Locked quote</span>{quote ? <><h2>Review locked terms</h2><dl><div><dt>Product</dt><dd>{quote.productName} · v{quote.productVersion}</dd></div><div><dt>Price</dt><dd>{quote.priceAtomic} {quote.asset}</dd></div><div><dt>Network</dt><dd>{quote.paymentNetwork}</dd></div><div><dt>Provider</dt><dd>{quote.providerId}</dd></div><div><dt>Order ID</dt><dd><code>{quote.id}</code></dd></div><div><dt>Profile</dt><dd>Simulation</dd></div></dl><button className="button button--primary" onClick={purchase} type="button">Purchase in simulation</button><small>This produces a local simulation receipt. It cannot be presented as payment or chain evidence.</small></> : <><h2>Terms stay visible before purchase.</h2><p>Set a budget and create a quote to pin version, provider, price, deadline, and terms digest.</p><div className="empty-quote"><span>01</span><strong>Configure</strong><span>02</span><strong>Review</strong><span>03</span><strong>Purchase</strong></div></>}</aside>
  </div>;
}
