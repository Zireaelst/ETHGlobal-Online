export type EvidenceMode = "simulation" | "live";

type Base = { orderId: string; mode: EvidenceMode };

export type OrderState =
  | (Base & { kind: "quoted" })
  | (Base & { kind: "reserved" })
  | (Base & { kind: "payment-pending"; paymentId: string; reconciledUnpaid: boolean })
  | (Base & { kind: "paid"; originalPaymentReceiptId: string })
  | (Base & { kind: "accepted"; deliveryId: string })
  | (Base & { kind: "warranty-paid"; originalPaymentReceiptId: string; warrantyReceiptId?: string })
  | (Base & { kind: "unpaid-expired" });

export type OrderEvent =
  | { type: "reserve" }
  | { type: "submit-payment"; paymentId: string }
  | { type: "reconcile-unpaid" }
  | { type: "observe-payment"; receiptId: string }
  | { type: "accept-delivery"; deliveryId: string }
  | { type: "finalize-invalid-delivery"; reason: "wrong-block" | "wrong-field" | "invalid-proof" | "timeout" }
  | { type: "record-warranty-receipt"; receiptId: string }
  | { type: "expire-unpaid" };

type ReservedState = Extract<OrderState, { kind: "reserved" }>;
type PaymentPendingState = Extract<OrderState, { kind: "payment-pending" }>;
type PaidState = Extract<OrderState, { kind: "paid" }>;
type AcceptedState = Extract<OrderState, { kind: "accepted" }>;
type WarrantyPaidState = Extract<OrderState, { kind: "warranty-paid" }>;
type UnpaidExpiredState = Extract<OrderState, { kind: "unpaid-expired" }>;

function invalidTransition(state: OrderState, event: OrderEvent): never {
  throw new Error(`Invalid order transition from ${state.kind} for event ${event.type}: ${JSON.stringify(event)}`);
}

export function isTerminal(state: OrderState): boolean {
  switch (state.kind) {
    case "accepted":
    case "warranty-paid":
    case "unpaid-expired":
      return true;
    case "quoted":
    case "reserved":
    case "payment-pending":
    case "paid":
      return false;
  }
}

export function reduceOrder(state: OrderState, event: { type: "reserve" }): ReservedState;
export function reduceOrder(state: OrderState, event: { type: "submit-payment"; paymentId: string }): PaymentPendingState;
export function reduceOrder(state: OrderState, event: { type: "reconcile-unpaid" }): PaymentPendingState;
export function reduceOrder(state: OrderState, event: { type: "observe-payment"; receiptId: string }): PaidState;
export function reduceOrder(state: OrderState, event: { type: "accept-delivery"; deliveryId: string }): AcceptedState;
export function reduceOrder(
  state: OrderState,
  event: { type: "finalize-invalid-delivery"; reason: Extract<OrderEvent, { type: "finalize-invalid-delivery" }>["reason"] },
): WarrantyPaidState;
export function reduceOrder(state: OrderState, event: { type: "record-warranty-receipt"; receiptId: string }): WarrantyPaidState;
export function reduceOrder(state: OrderState, event: { type: "expire-unpaid" }): UnpaidExpiredState;
export function reduceOrder(state: OrderState, event: OrderEvent): OrderState;
export function reduceOrder(state: OrderState, event: OrderEvent): OrderState {
  // Recording the separate warranty receipt enriches an already terminal
  // warranty result; it does not reopen or reverse the original payment.
  if (state.kind === "warranty-paid" && event.type === "record-warranty-receipt" && state.warrantyReceiptId === undefined) {
    return { ...state, warrantyReceiptId: event.receiptId };
  }

  if (isTerminal(state)) {
    throw new Error(`Cannot transition terminal order state ${state.kind} for event ${event.type}: ${JSON.stringify(event)}`);
  }

  switch (state.kind) {
    case "quoted":
      switch (event.type) {
        case "reserve":
          return { ...state, kind: "reserved" };
        default:
          return invalidTransition(state, event);
      }
    case "reserved":
      switch (event.type) {
        case "submit-payment":
          return { ...state, kind: "payment-pending", paymentId: event.paymentId, reconciledUnpaid: false };
        default:
          return invalidTransition(state, event);
      }
    case "payment-pending":
      switch (event.type) {
        case "reconcile-unpaid":
          return { ...state, reconciledUnpaid: true };
        case "observe-payment":
          if (state.reconciledUnpaid) return invalidTransition(state, event);
          return { ...state, kind: "paid", originalPaymentReceiptId: event.receiptId };
        case "expire-unpaid":
          if (!state.reconciledUnpaid) {
            throw new Error(`Cannot expire payment-pending order before reconciliation for event ${event.type}: ${JSON.stringify(event)}`);
          }
          return { ...state, kind: "unpaid-expired" };
        default:
          return invalidTransition(state, event);
      }
    case "paid":
      switch (event.type) {
        case "accept-delivery":
          return { ...state, kind: "accepted", deliveryId: event.deliveryId };
        case "finalize-invalid-delivery":
          return { ...state, kind: "warranty-paid" };
        default:
          return invalidTransition(state, event);
      }
    case "accepted":
    case "warranty-paid":
    case "unpaid-expired":
      return invalidTransition(state, event);
  }
}

export function evidenceAvailability(state: OrderState): "none" | "payment" | "delivery" | "terminal" {
  switch (state.kind) {
    case "quoted":
    case "reserved":
    case "payment-pending":
      return "none";
    case "paid":
      return "payment";
    case "accepted":
      return "delivery";
    case "warranty-paid":
    case "unpaid-expired":
      return "terminal";
  }
}
