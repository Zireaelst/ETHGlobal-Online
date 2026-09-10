import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Docs" };

const docs = [
  ["01", "Five-minute quickstart", "Choose a supported scope, set a hard budget, compare quote terms, authorize once, then inspect separate payment and delivery states."],
  ["02", "Protocol schemas", "Quote and manifest schemas bind order identity, source block, selected fields, verifier version, deadlines, payee and reserved warranty."],
  ["03", "Buyer SDK", "The buyer adapter consumes typed states; deterministic policy owns allowlists, retry limits, approval thresholds and evidence mode."],
  ["04", "Provider setup", "Fund collateral, publish signed terms, reserve liability, deliver a bounded witness, and wait for terminal resolution before withdrawal."],
  ["05", "Networks & evidence", "Deployment manifests and explorer bases appear only after checked live identifiers exist. Simulation never creates them."],
  ["06", "Threat model", "Checkpoint selection, payment observation, verifier correctness, storage layout and provider curation are explicit trust assumptions."],
];

export default function DocsPage() {
  return (
    <PageShell eyebrow="Documentation" title="Build against the terms, not the marketing." intro="Start with the order lifecycle, then inspect the schemas, integration boundaries and evidence rules that keep claims narrow.">
      <section className="docs-list">
        {docs.map(([index, title, body]) => <article key={title}><span>{index}</span><div><h2>{title}</h2><p>{body}</p></div></article>)}
      </section>
      <nav className="docs-next" aria-label="Documentation next steps"><Link href="/developers">Developer architecture →</Link><Link href="/proofs">Proof and trust scope →</Link></nav>
    </PageShell>
  );
}
