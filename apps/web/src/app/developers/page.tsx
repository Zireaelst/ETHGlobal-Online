import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Developers" };

export default function DevelopersPage() {
  return (
    <PageShell eyebrow="Developers" title="Deterministic policy around untrusted data." intro="Typed order states let a buyer agent propose a purchase while ordinary code keeps control of budgets, deadlines, proof checks and money movement.">
      <section className="feature-grid">
        <article><span className="index">SDK</span><h2>TypeScript client</h2><p>Use the same submit, run, status and result methods through an in-process durable runtime or the HTTP transport.</p></article>
        <article><span className="index">CLI</span><h2>JSON command line</h2><p>Run BlockTerms through npx-compatible commands with clean JSON stdout, stable exit codes and a local atomic order store.</p></article>
        <article><span className="index">MCP</span><h2>Agent tools</h2><p>Seven stdio tools expose requests, execution, retrieval, status, results, listing and credential-safe capabilities.</p></article>
      </section>
    </PageShell>
  );
}
