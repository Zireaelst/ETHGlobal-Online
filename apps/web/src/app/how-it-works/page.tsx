import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "How It Works" };

const steps = [
  ["Request", "The agent names one supported snapshot, field set, freshness bound, deadline and maximum spend."],
  ["Signed quote", "Providers return comparable terms: price, source block, proof coverage and collateral."],
  ["Reserve", "Collateral is locked to the order for a bounded TTL before payment authorization."],
  ["x402 payment", "The original purchase settles through the configured facilitator and remains independent of warranty resolution."],
  ["Verify delivery", "Deterministic checks bind the manifest to the expected block, code hash and selected storage fields."],
  ["Accept or warranty", "A valid final delivery is accepted. An invalid or late final delivery can authorize a separate collateral transfer."],
];

export default function HowItWorksPage() {
  return (
    <PageShell eyebrow="Order lifecycle" title="From bounded request to checked outcome." intro="One order carries explicit commercial terms through payment, delivery and resolution without asking a model to move money.">
      <ol className="process-grid">
        {steps.map(([title, body], index) => <li key={title}><span>{String(index + 1).padStart(2, "0")}</span><h2>{title}</h2><p>{body}</p></li>)}
      </ol>
      <section className="branch-panel">
        <div><span className="status status--warn"><span className="status__dot" />Settlement pending</span><h2>Retry is not a second payment attempt.</h2><p>The same order and payment identifier must be reconciled before retry or collateral release.</p></div>
        <div><span className="status status--neutral"><span className="status__dot" />Timeout path</span><h2>Deadlines stay bounded.</h2><p>A late provider-bound final delivery follows the warranty path only after the committed deadline and settlement state are checked.</p></div>
      </section>
    </PageShell>
  );
}
