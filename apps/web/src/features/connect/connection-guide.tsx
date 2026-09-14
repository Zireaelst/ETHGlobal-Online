"use client";

import Image from "next/image";
import { useState } from "react";
import { agentClients, interfaceRecipes } from "./client-recipes";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() { await navigator.clipboard?.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }
  return <button aria-label="Copy command" className="copy-button" onClick={copy} type="button">{copied ? "Copied" : "Copy"}</button>;
}

export function ConnectionGuide() {
  const [active, setActive] = useState("cli");
  const recipe = interfaceRecipes.find((item) => item.id === active) ?? interfaceRecipes[0]!;
  return <div className="connect-guide">
    <section className="connect-status"><div><span className="connect-live-dot" /><span><small>Local runtime</small><strong>Simulation ready</strong></span></div><p><strong>Real transport:</strong> MCP 2.0 over stdio</p><p><strong>Tool surface:</strong> marketplace + orders</p><p><strong>Credentials:</strong> optional until live mode</p></section>

    <section className="connect-quickstart"><div className="connect-section-heading"><span className="app-kicker">Quick start</span><h2>Connect a coding agent in three steps.</h2><p>Build once, register the stdio command with your client, then ask the agent to discover a product.</p></div><ol><li><span>01</span><div><strong>Build the binaries</strong><code>pnpm agent:build</code></div></li><li><span>02</span><div><strong>Start or register MCP</strong><code>pnpm agent:mcp</code></div></li><li><span>03</span><div><strong>Verify the connection</strong><code>pnpm --filter @blockterms/mcp test</code></div></li></ol></section>

    <section className="client-connectors"><div className="connect-section-heading"><span className="app-kicker">MCP clients</span><h2>One server. Your preferred agent.</h2><p>Run these commands from the repository root after `pnpm agent:build`. Each client starts the same Node process over stdio.</p></div><div className="client-cards">{agentClients.map((client) => <article key={client.name}><div><span className="client-logo"><Image alt={`${client.name} logo`} height={36} src={client.logo} width={36} /></span><div><h3>{client.name}</h3><small>stdio · project local</small></div></div><div className="command-block"><pre><code>{client.command}</code></pre><CopyButton value={client.command} /></div><p>Check: <code>{client.check}</code></p></article>)}</div></section>

    <section className="interface-recipes"><div className="connect-section-heading"><span className="app-kicker">How to use</span><h2>Pick the interface that fits your runtime.</h2><p>All four interfaces share the marketplace and order service contract.</p></div><div className="recipe-tabs" role="tablist" aria-label="BlockTerms interfaces">{interfaceRecipes.map((item) => <button aria-controls={`recipe-${item.id}`} aria-selected={active === item.id} id={`tab-${item.id}`} key={item.id} onClick={() => setActive(item.id)} role="tab" type="button">{item.label}</button>)}</div><div aria-labelledby={`tab-${recipe.id}`} className="recipe-panel" id={`recipe-${recipe.id}`} role="tabpanel"><div><span>{recipe.eyebrow}</span><h3>{recipe.label}</h3><p>{recipe.summary}</p><small>{recipe.note}</small></div><div className="command-block command-block--large"><pre><code>{recipe.code}</code></pre><CopyButton value={recipe.code} /></div></div><p className="execution-boundary">Commands run in your local terminal. This browser page shows copyable configuration and verified test commands; it does not imitate CLI or MCP execution.</p></section>

    <section className="tool-catalog"><div className="connect-section-heading"><span className="app-kicker">MCP tool catalog</span><h2>Structured operations agents can call.</h2></div><div>{["search_data_products", "get_data_product", "submit_data_product", "create_data_bundle", "submit_request", "run_order", "get_status", "get_result"].map((tool) => <code key={tool}>{tool}</code>)}</div></section>

    <section className="verification-strip"><div><span className="app-kicker">Proof of interoperability</span><h2>Test the actual interfaces end to end.</h2></div><div><code>pnpm agent:e2e</code><code>pnpm market:e2e</code><code>pnpm --filter @blockterms/mcp test</code></div></section>
  </div>;
}
