import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Developers" };

export default function DevelopersPage() {
  return (
    <PageShell eyebrow="Developers" title="One marketplace contract, every agent interface." intro="Discover products, submit orders, retrieve results, and inspect status through TypeScript, REST, CLI, or a real stdio MCP server.">
      <section className="feature-grid">
        <article><span className="index">SDK</span><h2>TypeScript client</h2><p>Use typed local or HTTP transports from a Node agent.</p></article>
        <article><span className="index">REST</span><h2>Language neutral</h2><p>Call stable JSON endpoints from services and workflow engines.</p></article>
        <article><span className="index">CLI + MCP</span><h2>Coding agents</h2><p>Connect Claude Code, Codex, OpenCode, CI, and any stdio MCP client.</p></article>
      </section>
      <div className="docs-next"><Link href="/app/agent-console">Open the complete connection guide →</Link></div>
    </PageShell>
  );
}
