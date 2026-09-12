import { z } from "zod";

const hexAddress = /^0x[0-9a-fA-F]{40}$/;
const hexQuantity = /^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/;
const positiveInteger = /^[1-9][0-9]*$/;

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).every(isJsonValue);
}

const metadataSchema = z.record(z.string(), z.unknown()).superRefine((value, context) => {
  if (!isJsonValue(value)) {
    context.addIssue({ code: "custom", message: "Metadata must contain JSON values only." });
    return;
  }
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > 8 * 1024) {
    context.addIssue({ code: "custom", message: "Metadata must not exceed 8 KiB." });
  }
});

export const SubmitRequestSchema = z.object({
  mode: z.enum(["auto", "simulation", "live"]).default("auto"),
  query: z.object({
    kind: z.literal("standardized-pools"),
    blockNumber: z.number().int().nonnegative().safe(),
    poolLimit: z.number().int().min(1).max(3).default(3),
  }).strict(),
  witness: z.object({
    network: z.string().regex(/^eip155:[1-9][0-9]*$/, "Witness network must be an EIP-155 CAIP-2 identifier."),
    address: z.string().regex(hexAddress, "Witness address must be an exact 20-byte hex value."),
    slots: z
      .array(z.string().regex(hexQuantity, "Storage slots must be canonical hex quantities."))
      .min(1, "Provide at least one storage slot.")
      .max(3, "Provide at most three storage slots."),
    block: z.string().regex(hexQuantity, "Witness block must be a canonical hex quantity."),
  }).strict(),
  policy: z.object({
    maxPaymentAtomic: z.string().regex(positiveInteger, "Maximum payment must be a positive atomic-unit integer."),
    allowedPaymentNetworks: z.array(z.string().min(1)).min(1).max(5),
    resourceUrl: z.url().refine((value) => value.startsWith("http://") || value.startsWith("https://"), "Resource URL must use HTTP or HTTPS."),
    deadlineMs: z.number().int().min(1_000).max(300_000),
  }).strict(),
  metadata: metadataSchema.optional(),
}).strict().superRefine((value, context) => {
  if (new Set(value.witness.slots.map((slot) => slot.toLowerCase())).size !== value.witness.slots.length) {
    context.addIssue({ code: "custom", path: ["witness", "slots"], message: "Storage slots must be unique." });
  }
  if (Number.parseInt(value.witness.block.slice(2), 16) !== value.query.blockNumber) {
    context.addIssue({ code: "custom", path: ["witness", "block"], message: "Graph and witness requests must use the same pinned block." });
  }
});

export type SubmitRequest = z.infer<typeof SubmitRequestSchema>;

export function parseSubmitRequest(value: unknown): SubmitRequest {
  const parsed = SubmitRequestSchema.safeParse(value);
  if (!parsed.success) throw new Error(`Invalid BlockTerms request: ${parsed.error.message}`);
  return parsed.data;
}
