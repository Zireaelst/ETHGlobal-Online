import type { ScenarioKey } from "./scenarios";

const base = ["Request scoped", "Quote selected", "Collateral reserved", "Payment pending"];

export function OrderTimeline({ scenario }: { scenario: ScenarioKey }) {
  const tail = scenario === "valid" ? ["Payment observed", "Witness verified", "Delivery accepted"]
    : scenario === "invalid" ? ["Payment observed", "Witness invalid", "Warranty pending"]
      : scenario === "pending" ? ["Reconciliation required"] : ["Human approval required"];
  const activeIndex = scenario === "over-budget" ? 1 : base.length + tail.length - 1;
  const steps = scenario === "over-budget" ? base.slice(0, 2).concat(tail) : base.concat(tail);
  return (
    <ol className="order-timeline" aria-label="Simulated order timeline">
      {steps.map((step, index) => (
        <li className={index < activeIndex ? "is-complete" : index === activeIndex ? "is-current" : ""} key={step}>
          <span aria-hidden="true">{index < activeIndex ? "✓" : String(index + 1).padStart(2, "0")}</span>
          <div><strong>{step}</strong><small>{index < activeIndex ? "Simulated checkpoint" : index === activeIndex ? "Current simulated state" : "Not reached"}</small></div>
        </li>
      ))}
    </ol>
  );
}
