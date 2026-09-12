import { z } from "zod";
import { SafeErrorSchema } from "./error";
import { isJsonValue, SubmitRequestSchema } from "./request";

const timestamp = z.iso.datetime({ offset: true });
const jsonObject = z.record(z.string(), z.unknown()).refine(isJsonValue, "Event detail must contain JSON values only.");
const forbiddenKey = /authorization|private.?key|mnemonic|secret|api.?token/i;

function containsSecretKey(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsSecretKey);
  return Object.entries(value as Record<string, unknown>).some(([key, nested]) => forbiddenKey.test(key) || containsSecretKey(nested));
}

export const ProtocolStateSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("quoted"), orderId: z.string().uuid(), mode: z.enum(["simulation", "live"]).optional() }),
  z.object({ kind: z.literal("reserved"), orderId: z.string().uuid(), mode: z.enum(["simulation", "live"]) }),
  z.object({ kind: z.literal("payment-pending"), orderId: z.string().uuid(), mode: z.enum(["simulation", "live"]), paymentId: z.string().min(1), reconciledUnpaid: z.boolean() }),
  z.object({ kind: z.literal("paid"), orderId: z.string().uuid(), mode: z.enum(["simulation", "live"]), originalPaymentReceiptId: z.string().min(1) }),
  z.object({ kind: z.literal("accepted"), orderId: z.string().uuid(), mode: z.enum(["simulation", "live"]), deliveryId: z.string().min(1) }),
  z.object({ kind: z.literal("warranty-paid"), orderId: z.string().uuid(), mode: z.enum(["simulation", "live"]), originalPaymentReceiptId: z.string().min(1), warrantyReceiptId: z.string().min(1).optional() }),
  z.object({ kind: z.literal("unpaid-expired"), orderId: z.string().uuid(), mode: z.enum(["simulation", "live"]) }),
]);

export const GraphSnapshotSchema = z.object({
  source: z.literal("graph"),
  deploymentLabel: z.string().min(1),
  protocol: z.object({
    id: z.string().min(1), name: z.string().min(1), network: z.string().min(1),
    schemaVersion: z.string().min(1), subgraphVersion: z.string().min(1), methodologyVersion: z.string().min(1),
  }),
  block: z.object({ number: z.number().int().nonnegative(), hash: z.string().min(1).optional() }),
  pools: z.array(z.object({ id: z.string().min(1), inputTokenIds: z.array(z.string()), inputTokenBalances: z.array(z.string().regex(/^\d+$/)) })).max(3),
});

export const WitnessResultSchema = z.object({
  network: z.string().min(1), address: z.string().min(1), blockNumber: z.number().int().nonnegative(),
  accountProofBytes: z.number().int().nonnegative(), storageProofBytes: z.number().int().nonnegative(),
  slotCount: z.number().int().min(1).max(3), codeHash: z.string().min(1), storageValues: z.record(z.string(), z.string()),
});

export const PaymentReceiptSchema = z.object({
  receiptId: z.string().min(1), network: z.string().min(1), amountAtomic: z.string().regex(/^\d+$/),
  asset: z.string().min(1).optional(), transactionId: z.string().min(1).optional(), observedAt: timestamp,
});

export const ExecutionResultSchema = z.object({
  mode: z.enum(["simulation", "live"]),
  graph: z.array(GraphSnapshotSchema).length(2),
  witness: WitnessResultSchema,
  payment: PaymentReceiptSchema,
  decision: z.enum(["accepted", "warranty-paid"]),
  deliveryId: z.string().min(1),
  warrantyReceiptId: z.string().min(1).optional(),
  completedAt: timestamp,
}).strict();

export const OrderEventSchema = z.object({
  at: timestamp,
  type: z.string().min(1).max(80),
  detail: jsonObject.optional(),
}).strict().superRefine((value, context) => {
  if (containsSecretKey(value.detail)) context.addIssue({ code: "custom", message: "Event detail contains a secret-bearing key." });
});

export const OrderRecordSchema = z.object({
  id: z.string().uuid(), createdAt: timestamp, updatedAt: timestamp, revision: z.number().int().nonnegative(),
  phase: z.enum(["queued", "running", "completed", "configuration_required", "failed"]),
  requestedMode: z.enum(["auto", "simulation", "live"]), selectedMode: z.enum(["simulation", "live"]).optional(),
  fallbackReasons: z.array(z.string().min(1)).max(20), request: SubmitRequestSchema,
  protocolState: ProtocolStateSchema, events: z.array(OrderEventSchema).max(100),
  result: ExecutionResultSchema.optional(), error: SafeErrorSchema.optional(),
}).strict().superRefine((value, context) => {
  if (value.phase === "completed" && value.result === undefined) context.addIssue({ code: "custom", path: ["result"], message: "Completed orders require a result." });
  if ((value.phase === "failed" || value.phase === "configuration_required") && value.error === undefined) {
    context.addIssue({ code: "custom", path: ["error"], message: `${value.phase} orders require an error.` });
  }
});

export type ProtocolState = z.infer<typeof ProtocolStateSchema>;
export type GraphSnapshot = z.infer<typeof GraphSnapshotSchema>;
export type WitnessResult = z.infer<typeof WitnessResultSchema>;
export type PaymentReceipt = z.infer<typeof PaymentReceiptSchema>;
export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;
export type OrderEvent = z.infer<typeof OrderEventSchema>;
export type OrderRecord = z.infer<typeof OrderRecordSchema>;
export type OrderStatus = Pick<OrderRecord, "id" | "phase" | "requestedMode" | "selectedMode" | "fallbackReasons" | "updatedAt" | "error">;

export function parseOrderRecord(value: unknown): OrderRecord {
  const parsed = OrderRecordSchema.safeParse(value);
  if (!parsed.success) throw new Error(`Invalid stored order: ${parsed.error.message}`);
  return parsed.data;
}
