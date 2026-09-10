import { describe, expect, it } from "vitest";
import {
  evidenceAvailability,
  isTerminal,
  reduceOrder,
  type OrderEvent,
  type OrderState,
} from "./order";

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

  it("rejects an unknown deserialized state kind in every state consumer", () => {
    const malformed = JSON.parse('{"kind":"future-state","orderId":"demo-order","mode":"simulation"}') as unknown as OrderState;

    expect(() => isTerminal(malformed)).toThrow(/Unknown order state kind.*future-state.*state/);
    expect(() => evidenceAvailability(malformed)).toThrow(/Unknown order state kind.*future-state.*state/);
    expect(() => reduceOrder(malformed, { type: "reserve" })).toThrow(/Unknown order state kind.*future-state.*event.*reserve.*state/);
  });

  it.each([
    {
      state: { kind: "reserved", orderId: "demo-order", mode: "simulation" },
      event: JSON.parse('{"type":"submit-payment"}') as unknown as OrderEvent,
      field: "paymentId",
    },
    {
      state: { kind: "payment-pending", orderId: "demo-order", mode: "simulation", paymentId: "sim-payment", reconciledUnpaid: false },
      event: JSON.parse('{"type":"observe-payment","receiptId":""}') as unknown as OrderEvent,
      field: "receiptId",
    },
    {
      state: { kind: "paid", orderId: "demo-order", mode: "simulation", originalPaymentReceiptId: "sim-receipt" },
      event: JSON.parse('{"type":"accept-delivery","deliveryId":"   "}') as unknown as OrderEvent,
      field: "deliveryId",
    },
    {
      state: { kind: "warranty-paid", orderId: "demo-order", mode: "simulation", originalPaymentReceiptId: "sim-receipt" },
      event: JSON.parse('{"type":"record-warranty-receipt","receiptId":null}') as unknown as OrderEvent,
      field: "receiptId",
    },
  ])("rejects a missing or blank $field in a deserialized event", ({ state, event, field }) => {
    expect(() => reduceOrder(state as OrderState, event)).toThrow(new RegExp(`${field}.*non-empty`));
  });

  it("rejects a finalize-invalid-delivery event with an unsupported reason", () => {
    const paid: OrderState = {
      kind: "paid",
      orderId: "demo-order",
      mode: "simulation",
      originalPaymentReceiptId: "sim-receipt",
    };
    const malformed = JSON.parse('{"type":"finalize-invalid-delivery","reason":"provider-error"}') as unknown as OrderEvent;

    expect(() => reduceOrder(paid, malformed)).toThrow(/finalize-invalid-delivery.*reason.*allowed/);
  });
});
