import Link from "next/link";
import type { CSSProperties } from "react";
import { CapabilityRow } from "./capability-row";

export function Hero() {
  return (
    <main className="landing-main">
      <section className="hero-copy" aria-labelledby="hero-title">
        <span className="hero-badge reveal" style={{ "--delay": "90ms" } as CSSProperties}>
          <span aria-hidden="true" /> Human + agent marketplace
        </span>
        <h1 className="reveal" id="hero-title" style={{ "--delay": "180ms" } as CSSProperties}>
          Pay AI agents for <em>data they can verify.</em>
        </h1>
        <p className="hero-lede reveal" style={{ "--delay": "300ms" } as CSSProperties}>
          Purchase live blockchain data through x402. Verify its onchain claims. Recover value from provider collateral when delivery breaks its terms.
        </p>
        <div className="hero-actions reveal" style={{ "--delay": "410ms" } as CSSProperties}>
          <Link className="button button--primary" href="/app/marketplace">Explore marketplace <span aria-hidden="true">↗</span></Link>
          <Link className="button button--ghost" href="/app/agent-console">Connect an agent <span aria-hidden="true">→</span></Link>
        </div>
      </section>
      <CapabilityRow />
    </main>
  );
}
