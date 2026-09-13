"use client";

import { useState } from "react";
import { Button, StatusBadge } from "@blockterms/ui";
import type { DataProduct } from "@blockterms/contracts";
import { EvidencePanel } from "./evidence-panel";
import { HumanApproval } from "./human-approval";
import { OrderTimeline } from "./order-timeline";
import { scenarioCopy, scenarioStates, type ScenarioKey } from "./scenarios";

const scenarios = Object.keys(scenarioCopy) as ScenarioKey[];

export function DemoConsole({ selectedProduct }: { selectedProduct?: DataProduct }) {
  const [scenario, setScenario] = useState<ScenarioKey>("valid");
  const state = scenarioStates[scenario];

  function exportSimulation() {
    const payload = JSON.stringify({
      mode: "simulation",
      scenario,
      state: state.kind,
      evidence: "educational-only",
      ...(selectedProduct ? { marketplace: {
        productId: selectedProduct.id,
        productVersion: selectedProduct.manifest.version,
        providerId: selectedProduct.provider.id,
      } } : {}),
    }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "blockterms-simulation.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="demo-console">
      <div className="demo-modebar"><StatusBadge tone="warn">Simulation</StatusBadge><p>Educational states only · no funds, live requests or chain evidence</p></div>
      <section className="request-card">
        <div className="panel-heading"><div><span className="eyebrow">01 / Request</span><h2>Define the purchase boundary</h2></div><span className="scope-tag">Read only</span></div>
        <div className="request-fields">
          <label>Data scope<input readOnly value="Same-block pool reserve snapshot" /></label>
          <label>Proof coverage<input readOnly value="Known account + selected storage fields" /></label>
          <label>Maximum spend<input readOnly value="Within example policy" /></label>
          <label>Delivery deadline<input readOnly value="Bounded by signed quote" /></label>
          {selectedProduct ? <>
            <p className="selection-note">Marketplace selection pinned · example terms only</p>
            <label>Product ID<input readOnly value={selectedProduct.id} /></label>
            <label>Provider and version<input readOnly value={`${selectedProduct.provider.id} · v${selectedProduct.manifest.version}`} /></label>
            <label className="request-field-wide">Bound resource URL<input readOnly value={selectedProduct.manifest.commercial.resourceUrl} /></label>
          </> : null}
        </div>
      </section>
      <section className="scenario-card">
        <div className="panel-heading"><div><span className="eyebrow">02 / Scenario</span><h2>Run a deterministic outcome</h2></div><strong className="state-label">{state.kind.replaceAll("-", " ")}</strong></div>
        <div className="scenario-tabs" role="group" aria-label="Simulation scenario">
          {scenarios.map((key) => <button aria-pressed={scenario === key} key={key} onClick={() => setScenario(key)} type="button">{scenarioCopy[key].label}</button>)}
        </div>
        <p className="scenario-summary">{scenarioCopy[scenario].summary}</p>
        <div className="quote-table" role="table" aria-label="Example quote comparison">
          <div className="quote-row quote-head" role="row"><span>Quote</span><span>Price</span><span>Freshness</span><span>Coverage</span><span>Collateral</span></div>
          <div className="quote-row is-selected" role="row"><strong data-label="Quote">Example A</strong><span data-label="Price">Within policy</span><span data-label="Freshness">Same block</span><span data-label="Coverage">3 fields</span><span data-label="Collateral">Reserved first</span></div>
          <div className="quote-row" role="row"><strong data-label="Quote">Example B</strong><span data-label="Price">{scenario === "over-budget" ? "Over policy" : "Within policy"}</span><span data-label="Freshness">Previous block</span><span data-label="Coverage">2 fields</span><span data-label="Collateral">Reserved first</span></div>
        </div>
        {scenario === "over-budget" ? <HumanApproval /> : null}
        {scenario === "pending" ? <p className="pending-note">Reconcile the same payment identifier before retry or release.</p> : null}
        <div className="console-actions">
          {scenario === "pending" ? <Button disabled>Retry payment</Button> : <Button disabled={scenario === "over-budget"}>Advance simulation</Button>}
          <Button onClick={exportSimulation} tone="ghost">Export simulation record</Button>
        </div>
      </section>
      <section className="timeline-card"><div className="panel-heading"><div><span className="eyebrow">03 / State</span><h2>Order timeline</h2></div></div><OrderTimeline scenario={scenario} /></section>
      <EvidencePanel scenario={scenario} />
    </div>
  );
}
