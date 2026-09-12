import { z } from "zod";

export const DomainErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "CONFLICT",
  "CONFIGURATION_REQUIRED",
  "POLICY_REJECTED",
  "UPSTREAM_ERROR",
  "INTERNAL_ERROR",
]);

export const SafeErrorSchema = z.object({
  code: DomainErrorCodeSchema,
  message: z.string().min(1).max(1_000),
  missing: z.array(z.string().regex(/^[A-Z][A-Z0-9_]*$/)).max(20).optional(),
  retryable: z.boolean(),
}).strict();

export type DomainErrorCode = z.infer<typeof DomainErrorCodeSchema>;
export type SafeError = z.infer<typeof SafeErrorSchema>;

export class BlockTermsError extends Error {
  readonly code: DomainErrorCode;
  readonly missing?: string[];
  readonly retryable: boolean;

  constructor(code: DomainErrorCode, message: string, options: { missing?: string[]; retryable?: boolean } = {}) {
    super(message);
    this.name = "BlockTermsError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    if (options.missing) this.missing = [...options.missing];
  }

  toSafeError(): SafeError {
    return SafeErrorSchema.parse({
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      ...(this.missing ? { missing: this.missing } : {}),
    });
  }
}
