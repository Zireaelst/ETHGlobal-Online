import type { ScenarioKey } from "./scenarios";

export function EvidencePanel({ scenario }: { scenario: ScenarioKey }) {
  const hasPayment = scenario === "valid" || scenario === "invalid";
  return (
    <section className="evidence-panel" aria-labelledby="evidence-title">
      <div className="panel-heading"><div><span className="eyebrow">Educational record</span><h2 id="evidence-title">Evidence boundaries</h2></div><span className="simulation-chip">No chain evidence</span></div>
      <dl className="receipt-list">
        <div><dt>Original payment receipt</dt><dd>{hasPayment ? "Simulated purchase receipt" : "Not observed"}</dd></div>
        <div><dt>Warranty receipt</dt><dd>{scenario === "invalid" ? "Not issued — simulated outcome" : "Not applicable"}</dd></div>
        <div><dt>Proof scope</dt><dd>Selected storage fields at one explicit block</dd></div>
        <div><dt>Checkpoint</dt><dd>Illustrative accepted state root only</dd></div>
      </dl>
      {scenario === "invalid" ? <p className="receipt-note">Purchase settlement remains final. A warranty is modeled as a separate collateral transfer.</p> : null}
      <div className="scope-warning"><span aria-hidden="true">!</span><p>This simulation does not prove full-query completeness, APY, TVL, price correctness, financial safety, or source-chain finality.</p></div>
    </section>
  );
}
