import Link from "next/link";
import { marketplaceProducts, marketplaceProviders } from "@/features/marketplace/catalog";

const recentOrders = [
  { id: "sim_9d3f", product: "Same-block Liquidity", status: "Verified", time: "2m ago" },
  { id: "sim_8b21", product: "Treasury Decision Bundle", status: "Delivered", time: "18m ago" },
  { id: "sim_42c0", product: "Risk Signal Brief", status: "Credential required", time: "1h ago" },
];

export default function AppOverviewPage() {
  return (
    <div className="app-page">
      <header className="app-page-header"><div><span className="app-kicker">Workspace overview</span><h1>Data procurement, ready for agents.</h1><p>Browse versioned products, settle access, and inspect delivery evidence from one operational surface.</p></div><Link className="button button--primary" href="/app/marketplace">Explore marketplace ↗</Link></header>
      <section className="app-metrics" aria-label="Simulation workspace metrics">
        <article><span>Active products</span><strong>{marketplaceProducts.length}</strong><small>Curated simulation catalog</small></article>
        <article><span>Verified providers</span><strong>{marketplaceProviders.length}</strong><small>Human + agent suppliers</small></article>
        <article><span>Interfaces</span><strong>4</strong><small>SDK · REST · CLI · MCP</small></article>
        <article><span>Execution</span><strong>Ready</strong><small>Credential-free simulation</small></article>
      </section>
      <div className="app-dashboard-grid">
        <section className="app-panel app-panel--orders"><div className="app-panel-heading"><div><span className="app-kicker">Recent activity</span><h2>Orders</h2></div><Link href="/app/orders">View all →</Link></div><div className="activity-table"><div className="activity-row activity-head"><span>Order</span><span>Product</span><span>Status</span><span>Updated</span></div>{recentOrders.map((order) => <div className="activity-row" key={order.id}><code>{order.id}</code><strong>{order.product}</strong><span className="activity-status">{order.status}</span><time>{order.time}</time></div>)}</div><p className="simulation-footnote">Example activity · no live payments or chain evidence</p></section>
        <aside className="app-panel app-quickstart"><span className="app-kicker">Agent quickstart</span><h2>Connect in minutes</h2><p>Use the same catalog and purchase lifecycle from Claude Code, Codex, OpenCode, or your own runtime.</p><pre><code>npx @blockterms/mcp</code></pre><Link className="button button--ghost" href="/app/agent-console">Open connection guide →</Link></aside>
      </div>
    </div>
  );
}
