export type EvidenceMode = "simulation" | "live";

type Base = { orderId: string; mode: EvidenceMode };

const ORDER_STATE_KINDS = [
  "quoted",
  "reserved",
  "payment-pending",
  "paid",
  "accepted",
  "warranty-paid",
  "unpaid-expired",
] as const;
type OrderStateKind = (typeof ORDER_STATE_KINDS)[number];

const INVALID_DELIVERY_REASONS = ["wrong-block", "wrong-field", "invalid-proof", "timeout"] as const;
type InvalidDeliveryReason = (typeof INVALID_DELIVERY_REASONS)[number];

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

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : undefined;
}

function describe(value: unknown): string {
  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined ? String(value) : serialized;
  } catch {
    return String(value);
  }
}

function eventType(value: unknown): string {
  const record = asRecord(value);
  return typeof record?.type === "string" ? record.type : "<unknown>";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function invalidState(state: unknown, operation: string, event?: unknown): never {
  const eventContext = event === undefined ? "" : ` for event ${JSON.stringify(eventType(event))}`;
  const eventDetails = event === undefined ? "" : `; event: ${describe(event)}`;
  throw new Error(`Invalid order state while ${operation}${eventContext}; state: ${describe(state)}${eventDetails}`);
}

function assertValidState(state: unknown, operation: string, event?: unknown): asserts state is OrderState {
  const record = asRecord(state);
  const kind = record?.kind;
  const eventContext = event === undefined ? "" : ` for event ${JSON.stringify(eventType(event))}`;
  const eventDetails = event === undefined ? "" : `; event: ${describe(event)}`;

  if (typeof kind !== "string" || !ORDER_STATE_KINDS.includes(kind as OrderStateKind)) {
    throw new Error(`Unknown order state kind ${describe(kind)} while ${operation}${eventContext}; state: ${describe(state)}${eventDetails}`);
  }
  if (!record) invalidState(state, operation, event);

  if (!isNonEmptyString(record.orderId) || (record.mode !== "simulation" && record.mode !== "live")) {
    invalidState(state, operation, event);
  }

  switch (kind) {
    case "payment-pending":
      if (!isNonEmptyString(record.paymentId) || typeof record.reconciledUnpaid !== "boolean") {
        invalidState(state, operation, event);
      }
      break;
    case "paid":
      if (!isNonEmptyString(record.originalPaymentReceiptId)) invalidState(state, operation, event);
      break;
    case "accepted":
      if (!isNonEmptyString(record.deliveryId)) invalidState(state, operation, event);
      break;
    case "warranty-paid":
      if (!isNonEmptyString(record.originalPaymentReceiptId) ||
        (record.warrantyReceiptId !== undefined && !isNonEmptyString(record.warrantyReceiptId))) {
        invalidState(state, operation, event);
      }
      break;
    case "quoted":
    case "reserved":
    case "unpaid-expired":
      break;
  }
}

function validateEvent(state: OrderState, event: unknown): asserts event is OrderEvent {
  const record = asRecord(event) ?? {};
  const type = record?.type;
  const context = ` for state ${JSON.stringify(state.kind)}; event: ${describe(event)}`;

  switch (type) {
    case "reserve":
    case "reconcile-unpaid":
    case "expire-unpaid":
      return;
    case "submit-payment":
      if (!isNonEmptyString(record.paymentId)) {
        throw new Error(`Invalid submit-payment event: paymentId must be a non-empty string${context}`);
      }
      return;
    case "observe-payment":
      if (!isNonEmptyString(record.receiptId)) {
        throw new Error(`Invalid observe-payment event: receiptId must be a non-empty string${context}`);
      }
      return;
    case "accept-delivery":
      if (!isNonEmptyString(record.deliveryId)) {
        throw new Error(`Invalid accept-delivery event: deliveryId must be a non-empty string${context}`);
      }
      return;
    case "finalize-invalid-delivery":
      if (!INVALID_DELIVERY_REASONS.includes(record.reason as InvalidDeliveryReason)) {
        throw new Error(
          `Invalid finalize-invalid-delivery reason ${describe(record.reason)}; allowed reasons: ${INVALID_DELIVERY_REASONS.join(", ")}${context}`,
        );
      }
      return;
    case "record-warranty-receipt":
      if (!isNonEmptyString(record.receiptId)) {
        throw new Error(`Invalid record-warranty-receipt event: receiptId must be a non-empty string${context}`);
      }
      return;
    default:
      throw new Error(`Unknown order event type ${describe(type)}${context}`);
  }
}

function invalidTransition(state: OrderState, event: OrderEvent): never {
  throw new Error(`Invalid order transition from ${state.kind} for event ${event.type}: ${JSON.stringify(event)}`);
}

export function isTerminal(state: OrderState): boolean {
  assertValidState(state, "checking terminal status");
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
    default:
      throw new Error("Unreachable order state kind while checking terminal status");
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
  assertValidState(state, "reducing", event);
  validateEvent(state, event);

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
  assertValidState(state, "checking evidence availability");
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
    default:
      throw new Error("Unreachable order state kind while checking evidence availability");
  }
}
