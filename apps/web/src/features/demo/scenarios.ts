import { reduceOrder, type OrderState } from "@blockterms/protocol";

export type ScenarioKey = "valid" | "invalid" | "over-budget" | "pending";

const quoted = (orderId: string): OrderState => ({ kind: "quoted", orderId, mode: "simulation" });

function paid(orderId: string) {
  const reserved = reduceOrder(quoted(orderId), { type: "reserve" });
  const pending = reduceOrder(reserved, { type: "submit-payment", paymentId: "simulation-payment-intent" });
  return reduceOrder(pending, { type: "observe-payment", receiptId: "simulation-purchase-receipt" });
}

export const scenarioStates: Record<ScenarioKey, OrderState> = {
  valid: reduceOrder(paid("demo-order-valid"), { type: "accept-delivery", deliveryId: "simulation-delivery" }),
  invalid: reduceOrder(paid("demo-order-invalid"), { type: "finalize-invalid-delivery", reason: "invalid-proof" }),
  "over-budget": quoted("demo-order-over-budget"),
  pending: reduceOrder(reduceOrder(quoted("demo-order-pending"), { type: "reserve" }), {
    type: "submit-payment",
    paymentId: "simulation-payment-intent",
  }),
};

export const scenarioCopy: Record<ScenarioKey, { label: string; summary: string }> = {
  valid: { label: "Valid delivery", summary: "The selected fields agree with the bounded witness and the delivery is accepted." },
  invalid: { label: "Invalid proof", summary: "A provider-bound final delivery fails the selected-field check and enters warranty resolution." },
  "over-budget": { label: "Over budget", summary: "The best eligible quote exceeds policy, so the agent stops for human approval." },
  pending: { label: "Settlement pending", summary: "Payment observation is unresolved. The same identifier must be reconciled before any retry." },
};
