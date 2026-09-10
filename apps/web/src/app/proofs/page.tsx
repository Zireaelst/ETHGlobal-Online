import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { ProofScope } from "@/components/proof-scope";

export const metadata: Metadata = { title: "Proofs" };

export default function ProofsPage() {
  return (
    <PageShell eyebrow="Proofs" title="A narrow claim, made inspectable." intro="The delivery manifest tells the verifier exactly which account, fields, code layout, block and accepted root must agree.">
      <section className="manifest-grid">
        <article><span>Manifest field</span><h2>Source commitment</h2><dl><div><dt>Network</dt><dd>Configured source chain</dd></div><div><dt>Block</dt><dd>Explicit numeric height</dd></div><div><dt>State root</dt><dd>Accepted checkpoint input</dd></div></dl></article>
        <article><span>Verification scope</span><h2>Selected state</h2><dl><div><dt>Account</dt><dd>Known-layout contract</dd></div><div><dt>Code hash</dt><dd>Pinned implementation</dd></div><div><dt>Storage</dt><dd>One to three declared slots</dd></div></dl></article>
      </section>
      <ProofScope />
      <details className="raw-panel"><summary>Inspect raw witness shape</summary><pre aria-label="Illustrative witness schema">{`{
  "mode": "simulation",
  "block": "explicit numeric height",
  "accountProof": ["RLP proof nodes omitted"],
  "storageProof": ["selected slots only"]
}`}</pre><p>Illustrative schema only. No address, hash, explorer link or transaction evidence is generated.</p></details>
    </PageShell>
  );
}
