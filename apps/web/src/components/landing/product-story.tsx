import Link from "next/link";
import { marketplaceProducts } from "@/features/marketplace/catalog";

const workflow = [
  ["01", "Discover", "Search curated, versioned products with declared providers, schemas, prices, and proof boundaries."],
  ["02", "Lock terms", "Pin the product version, budget, deadline, delivery scope, and warranty before money moves."],
  ["03", "Settle", "Agents pay an x402-gated resource through the Hedera payment adapter under deterministic policy."],
  ["04", "Validate", "The delivery is checked against its accepted state root and narrowly declared storage fields."],
  ["05", "Resolve", "A broken commitment triggers a separate warranty payment from collateral reserved before purchase."],
] as const;

const interfaces = [
  ["TypeScript SDK", "Typed discovery, purchase, status, and result calls inside any Node agent."],
  ["REST API", "Stable JSON endpoints for services, workflow engines, and browser integrations."],
  ["npx CLI", "Scriptable JSON output for operators, CI, Claude Code, Codex, and OpenCode."],
  ["MCP", "A real stdio server with structured tools that agent clients can connect to directly."],
] as const;

const terminalExample = [
  "$ npx @blockterms/mcp",
  "✓ stdio transport connected",
  "✓ structured tools discovered",
  "→ search_data_products { \"query\": \"liquidity\" }",
].join("\n");

export function ProductStory() {
  return (
    <div className="landing-story">
      <section className="story-section story-problem" id="product">
        <div className="story-heading"><span>Why BlockTerms</span><h2>Data procurement has too many trust gaps.</h2></div>
        <div className="problem-ledger"><article><strong>01</strong><h3>Discovery without guarantees</h3><p>Listings rarely bind schema, freshness, source, price, and recourse into one machine-readable agreement.</p></article><article><strong>02</strong><h3>Payment without proof</h3><p>An HTTP success response does not establish that delivered blockchain data matched its promised state.</p></article><article><strong>03</strong><h3>Automation without recourse</h3><p>Agents need deterministic policy and a warranty path they can execute without a manual dispute desk.</p></article></div>
      </section>

      <section className="story-section story-workflow">
        <div className="story-heading"><span>Product lifecycle</span><h2>One lifecycle, from discovery to recourse.</h2><p>Each step preserves the same product version, terms hash, and order identity for humans and agents.</p></div>
        <ol>{workflow.map(([index, title, copy]) => <li key={title}><span>{index}</span><div><h3>{title}</h3><p>{copy}</p></div></li>)}</ol>
      </section>

      <section className="story-section story-market" id="use-cases">
        <div className="story-heading story-heading--split"><div><span>Verified Data Marketplace</span><h2>Built for real data products.</h2></div><Link href="/app/marketplace">Open the marketplace →</Link></div>
        <p className="story-disclosure">Simulation catalog · interface fixtures, no live listing or transaction claims</p>
        <div className="story-product-grid">{marketplaceProducts.map((product) => <Link href={`/app/marketplace/${product.manifest.slug}`} key={product.id}><div><span>{product.manifest.kind}</span><span>{product.manifest.access?.visibility === "credential-gated" ? "private" : "curated"}</span></div><h3>{product.manifest.name}</h3><p>{product.manifest.summary}</p><dl><div><dt>Provider</dt><dd>{product.provider.displayName}</dd></div><div><dt>Coverage</dt><dd>{product.manifest.commercial.collateralCoverageBps / 100}%</dd></div><div><dt>Delivery</dt><dd>≤ {product.manifest.deliverySeconds}s</dd></div></dl></Link>)}</div>
      </section>

      <section className="story-section product-modes">
        <article><span>Composable bundles</span><h3>Combine products without hiding lineage.</h3><p>Join two to five compatible, version-pinned sources into one same-block procurement plan with named outputs.</p><Link href="/app/marketplace/treasury-decision-bundle">Inspect a bundle →</Link></article>
        <article><span>Credentialed private data</span><h3>Control eligibility separately from correctness.</h3><p>Require an organization or source-access credential while keeping delivery validation and payment evidence independent.</p><Link href="/app/marketplace/risk-signal-brief">Inspect private access →</Link></article>
      </section>

      <section className="story-section story-interfaces">
        <div className="story-heading story-heading--split"><div><span>Agent-native by design</span><h2>Every interface speaks the same marketplace.</h2></div><Link href="/app/agent-console">See every connection option →</Link></div>
        <div className="interface-grid">{interfaces.map(([title, copy], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
        <div className="interface-code"><div><i /><i /><i /><span>agent-session</span></div><pre><code>{terminalExample}</code></pre><small>Connection example. Run the checked-in smoke test for verified local output.</small></div>
      </section>

      <section className="story-section architecture-story">
        <div className="story-heading"><span>Accountable infrastructure</span><h2>Payments, data, and proof stay accountable.</h2></div>
        <div className="architecture-track"><article><strong>H</strong><div><h3>Hedera</h3><p>x402 agentic payment settlement and audit anchoring behind explicit live configuration.</p></div></article><span aria-hidden="true" /><article><strong>G</strong><div><h3>The Graph</h3><p>Standardized products composed across two protocol deployments at a pinned block.</p></div></article><span aria-hidden="true" /><article><strong>B</strong><div><h3>BlockTerms verifier</h3><p>Deterministic policy, bounded EIP-1186 checks, receipt separation, and warranty outcome.</p></div></article></div>
      </section>

      <section className="story-cta"><span>Ready for humans. Native for agents.</span><h2>Give every data purchase terms it can prove.</h2><div><Link className="button button--primary" href="/app">Open BlockTerms ↗</Link><Link className="button button--ghost" href="/app/agent-console">Connect your agent →</Link></div></section>
    </div>
  );
}
