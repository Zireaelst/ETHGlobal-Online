import { describe, expect, it } from "vitest";
import { evidenceAvailability, isTerminal, reduceOrder, type OrderState } from "./order";

describe("reduceOrder", () => {
  const quoted: OrderState = { kind: "quoted", orderId: "demo-order", mode: "simulation" };

  it("requires reconciliation before an unpaid reservation expires", () => {
    const reserved = reduceOrder(quoted, { type: "reserve" });
    const pending = reduceOrder(reserved, { type: "submit-payment", paymentId: "sim-payment" });
    expect(() => reduceOrder(pending, { type: "expire-unpaid" })).toThrow("reconciliation");
    const reconciled = reduceOrder(pending, { type: "reconcile-unpaid" });
    expect(reduceOrder(reconciled, { type: "expire-unpaid" }).kind).toBe("unpaid-expired");
  });

  it("separates payment from warranty", () => {
    const reserved = reduceOrder(quoted, { type: "reserve" });
    const pending = reduceOrder(reserved, { type: "submit-payment", paymentId: "sim-payment" });
    const paid = reduceOrder(pending, { type: "observe-payment", receiptId: "sim-receipt" });
    expect(evidenceAvailability(paid)).toBe("payment");
    const warranted = reduceOrder(paid, { type: "finalize-invalid-delivery", reason: "wrong-block" });
    expect(warranted.kind).toBe("warranty-paid");
    expect(warranted.originalPaymentReceiptId).toBe("sim-receipt");
    expect(warranted.warrantyReceiptId).toBeUndefined();
  });

  it("does not allow a terminal order to transition", () => {
    const terminal: OrderState = { kind: "accepted", orderId: "demo-order", mode: "simulation", deliveryId: "sim-delivery" };
    expect(isTerminal(terminal)).toBe(true);
    expect(() => reduceOrder(terminal, { type: "reserve" })).toThrow("terminal");
  });
});
