export function ProofScope({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`proof-scope${compact ? " proof-scope--compact" : ""}`} aria-labelledby="proof-scope-title">
      <div>
        <span className="eyebrow">Bounded verification</span>
        <h2 id="proof-scope-title">What the witness can establish</h2>
        <p>An EIP-1186 witness checks selected storage fields and the account code hash against one accepted state root at one explicit block.</p>
      </div>
      <aside className="limit-panel" aria-labelledby="proof-limits-title">
        <span className="limit-icon" aria-hidden="true">!</span>
        <div>
          <h3 id="proof-limits-title">What this does not prove</h3>
          <p>It does not prove full-query completeness, APY or TVL correctness, price quality, financial safety, or trustless source-chain finality.</p>
        </div>
      </aside>
    </section>
  );
}
