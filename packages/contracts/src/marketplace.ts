import { z } from "zod";
import { isJsonValue } from "./request";

const positiveAtomic = /^[1-9][0-9]*$/;
const digest = /^0x[0-9a-fA-F]{64}$/;
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const semver = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/;
const forbiddenKey = /authorization|private.?key|mnemonic|secret|api.?token|password/i;

function containsSecretKey(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsSecretKey);
  return Object.entries(value as Record<string, unknown>).some(([key, nested]) => forbiddenKey.test(key) || containsSecretKey(nested));
}

export const ProviderIdentitySchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,63}$/),
  type: z.enum(["human", "agent", "organization"]),
  displayName: z.string().trim().min(2).max(80),
}).strict();

export const CredentialAttestationSchema = z.object({
  kind: z.enum(["zk-tls", "wallet-control", "organization", "custom"]),
  issuer: z.string().trim().min(1).max(100),
  subject: z.string().trim().min(1).max(120),
  issuedAt: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }),
  reference: z.url().refine((value) => value.startsWith("https://"), "Credential reference must use HTTPS."),
}).strict().refine((value) => Date.parse(value.expiresAt) > Date.parse(value.issuedAt), {
  message: "Credential expiry must be after issue time.",
});

export const CredentialRequirementSchema = z.object({
  kind: z.enum(["zk-tls", "wallet-control", "organization", "custom"]),
  issuer: z.string().trim().min(1).max(100).optional(),
  subject: z.string().trim().min(1).max(120).optional(),
}).strict();

export const ProductAccessPolicySchema = z.object({
  visibility: z.enum(["public", "credential-gated"]),
  requiredCredentials: z.array(CredentialRequirementSchema).max(5),
}).strict().superRefine((value, context) => {
  if (value.visibility === "public" && value.requiredCredentials.length > 0) {
    context.addIssue({ code: "custom", path: ["requiredCredentials"], message: "Public products cannot require buyer credentials." });
  }
  if (value.visibility === "credential-gated" && value.requiredCredentials.length === 0) {
    context.addIssue({ code: "custom", path: ["requiredCredentials"], message: "Credential-gated products require at least one buyer credential." });
  }
});

export const BundleCompositionSchema = z.object({
  method: z.literal("same-block-union"),
  components: z.array(z.object({
    productId: z.string().uuid(),
    version: z.string().regex(semver),
    outputAlias: z.string().regex(/^[a-z][a-z0-9_]{1,31}$/),
  }).strict()).min(2).max(5),
}).strict().superRefine((value, context) => {
  const aliases = value.components.map((component) => component.outputAlias);
  if (new Set(aliases).size !== aliases.length) context.addIssue({ code: "custom", path: ["components"], message: "Bundle output aliases must be unique." });
  const keys = value.components.map((component) => `${component.productId}@${component.version}`);
  if (new Set(keys).size !== keys.length) context.addIssue({ code: "custom", path: ["components"], message: "Bundle components must be unique." });
});

export const DataProductManifestSchema = z.object({
  slug: z.string().min(3).max(80).regex(slug),
  name: z.string().trim().min(3).max(100),
  summary: z.string().trim().min(20).max(500),
  version: z.string().regex(semver),
  kind: z.enum(["snapshot", "stream", "report", "bundle"]),
  tags: z.array(z.string().regex(/^[a-z0-9][a-z0-9-]{1,31}$/)).max(10),
  schema: z.object({ family: z.string().min(2).max(80), version: z.string().regex(semver) }).strict(),
  networks: z.array(z.string().regex(/^[a-z0-9]+:[a-zA-Z0-9-]+$/)).min(1).max(8),
  deployments: z.array(z.string().min(1).max(160)).min(1).max(8),
  freshnessSeconds: z.number().int().min(1).max(86400),
  deliverySeconds: z.number().int().min(1).max(300),
  commercial: z.object({
    priceAtomic: z.string().regex(positiveAtomic, "Price must be a positive atomic-unit integer."),
    paymentNetwork: z.string().min(1).max(80),
    asset: z.string().min(1).max(80),
    resourceUrl: z.url().refine((value) => value.startsWith("https://") || value.startsWith("http://localhost"), "Resource URL must use HTTPS."),
    warrantyAtomic: z.string().regex(positiveAtomic, "Warranty must be a positive atomic-unit integer."),
    collateralCoverageBps: z.number().int().min(10000, "Collateral coverage must be at least 10000 basis points.").max(100000),
  }).strict(),
  verification: z.object({
    profile: z.literal("graph-eip1186-v1"),
    maxPools: z.number().int().min(1).max(3),
    maxStorageSlots: z.number().int().min(1).max(3),
  }).strict(),
  sample: z.object({
    digest: z.string().regex(digest),
    uri: z.string().refine((value) => value.startsWith("ipfs://") || value.startsWith("https://"), "Sample URI must use IPFS or HTTPS."),
  }).strict(),
  access: ProductAccessPolicySchema.optional(),
  credentials: z.array(CredentialAttestationSchema).max(10).default([]),
}).strict().superRefine((value, context) => {
  if (new Set(value.tags).size !== value.tags.length) context.addIssue({ code: "custom", path: ["tags"], message: "Tags must be unique." });
  if (new Set(value.networks).size !== value.networks.length) context.addIssue({ code: "custom", path: ["networks"], message: "Networks must be unique." });
});

const MetadataSchema = z.record(z.string(), z.unknown()).superRefine((value, context) => {
  if (!isJsonValue(value)) context.addIssue({ code: "custom", message: "Metadata must contain JSON values only." });
  if (containsSecretKey(value)) context.addIssue({ code: "custom", message: "Metadata contains a secret-bearing key." });
});

const ProductRequestBaseSchema = z.object({
  provider: ProviderIdentitySchema,
  metadata: MetadataSchema.optional(),
}).strict();

export const SubmitProductRequestSchema = ProductRequestBaseSchema.extend({
  manifest: DataProductManifestSchema,
}).strict().superRefine((value, context) => {
  if (containsSecretKey(value)) context.addIssue({ code: "custom", message: "Product request contains a secret-bearing key." });
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > 32 * 1024) context.addIssue({ code: "custom", message: "Product manifest must not exceed 32 KiB." });
  if (value.manifest.kind === "bundle") context.addIssue({ code: "custom", path: ["manifest", "kind"], message: "Use create bundle for bundle products." });
});

export const CreateBundleRequestSchema = ProductRequestBaseSchema.extend({
  manifest: DataProductManifestSchema.safeExtend({ kind: z.literal("bundle") }),
  composition: BundleCompositionSchema,
}).strict().superRefine((value, context) => {
  if (containsSecretKey(value)) context.addIssue({ code: "custom", message: "Bundle request contains a secret-bearing key." });
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > 32 * 1024) context.addIssue({ code: "custom", message: "Bundle manifest must not exceed 32 KiB." });
});

export const SandboxReviewSchema = z.object({
  passed: z.boolean(),
  checkedAt: z.iso.datetime({ offset: true }),
  sampleDigest: z.string().regex(digest),
  notes: z.string().max(500).optional(),
}).strict();

export const ReviewProductRequestSchema = z.object({
  decision: z.enum(["approve", "reject", "suspend", "deprecate"]),
  curatorId: z.string().min(3).max(80),
  reason: z.string().trim().min(3).max(500),
  sandbox: SandboxReviewSchema.optional(),
}).strict();

export const DataProductSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  revision: z.number().int().nonnegative(),
  state: z.enum(["draft", "pending-review", "active", "rejected", "suspended", "deprecated"]),
  provider: ProviderIdentitySchema,
  manifest: DataProductManifestSchema,
  composition: BundleCompositionSchema.optional(),
  review: z.object({ curatorId: z.string(), reason: z.string(), reviewedAt: z.iso.datetime({ offset: true }), sandbox: SandboxReviewSchema.optional() }).strict().optional(),
  auditAnchor: z.object({ network: z.string(), reference: z.string(), digest: z.string().regex(digest) }).strict().optional(),
}).strict();

export const ProductFilterSchema = z.object({
  query: z.string().trim().min(1).max(100).optional(),
  providerType: z.enum(["human", "agent", "organization"]).optional(),
  schemaFamily: z.string().min(1).max(80).optional(),
  network: z.string().min(1).max(80).optional(),
  kind: z.enum(["snapshot", "stream", "report", "bundle"]).optional(),
  maxPriceAtomic: z.string().regex(positiveAtomic, "Maximum price must be a positive atomic-unit integer.").optional(),
  maxFreshnessSeconds: z.number().int().positive().max(86400).optional(),
  minCollateralCoverageBps: z.number().int().min(10000).max(100000).optional(),
  credentialKind: z.enum(["zk-tls", "wallet-control", "organization", "custom"]).optional(),
  includeInactive: z.boolean().default(false),
  limit: z.number().int().min(1).max(100).default(50),
}).strict();

export const ProviderMetricsSchema = z.object({
  live: z.object({ completed: z.number().int().nonnegative(), valid: z.number().int().nonnegative(), invalid: z.number().int().nonnegative(), late: z.number().int().nonnegative(), warranties: z.number().int().nonnegative(), totalPaidAtomic: z.string().regex(/^\d+$/), medianLatencyMs: z.number().int().nonnegative().optional(), p95LatencyMs: z.number().int().nonnegative().optional() }).strict(),
  simulation: z.object({ completed: z.number().int().nonnegative(), valid: z.number().int().nonnegative(), invalid: z.number().int().nonnegative(), late: z.number().int().nonnegative(), warranties: z.number().int().nonnegative() }).strict(),
}).strict();

export const ProviderProfileSchema = z.object({
  provider: ProviderIdentitySchema,
  productIds: z.array(z.string().uuid()),
  credentials: z.array(CredentialAttestationSchema),
  outcomeOrderIds: z.array(z.string().uuid()),
  liveLatenciesMs: z.array(z.number().int().nonnegative()).max(10000),
  metrics: ProviderMetricsSchema,
}).strict();

export const RecordProductOutcomeRequestSchema = z.object({
  orderId: z.string().uuid(),
  productId: z.string().uuid(),
  providerId: z.string().min(3).max(64),
  mode: z.enum(["simulation", "live"]),
  outcome: z.enum(["valid", "invalid", "late"]),
  warrantyPaid: z.boolean(),
  paidAtomic: z.string().regex(/^\d+$/),
  latencyMs: z.number().int().nonnegative(),
}).strict();

export type ProviderIdentity = z.infer<typeof ProviderIdentitySchema>;
export type CredentialAttestation = z.infer<typeof CredentialAttestationSchema>;
export type CredentialRequirement = z.infer<typeof CredentialRequirementSchema>;
export type ProductAccessPolicy = z.infer<typeof ProductAccessPolicySchema>;
export type BundleComposition = z.infer<typeof BundleCompositionSchema>;
export type DataProductManifest = z.infer<typeof DataProductManifestSchema>;
export type SubmitProductRequest = z.infer<typeof SubmitProductRequestSchema>;
export type CreateBundleRequest = z.infer<typeof CreateBundleRequestSchema>;
export type ReviewProductRequest = z.infer<typeof ReviewProductRequestSchema>;
export type DataProduct = z.infer<typeof DataProductSchema>;
export type ProductFilter = z.input<typeof ProductFilterSchema>;
export type ProviderMetrics = z.infer<typeof ProviderMetricsSchema>;
export type ProviderProfile = z.infer<typeof ProviderProfileSchema>;
export type RecordProductOutcomeRequest = z.infer<typeof RecordProductOutcomeRequestSchema>;

function parse<T>(schema: z.ZodType<T>, value: unknown, label: string): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new Error(`Invalid ${label}: ${parsed.error.message}`);
  return parsed.data;
}

export const parseSubmitProductRequest = (value: unknown) => parse(SubmitProductRequestSchema, value, "product request");
export const parseCreateBundleRequest = (value: unknown) => parse(CreateBundleRequestSchema, value, "bundle request");
export const parseReviewProductRequest = (value: unknown) => parse(ReviewProductRequestSchema, value, "product review");
export const parseProductFilter = (value: unknown) => parse(ProductFilterSchema, value, "product filter");
export const parseDataProduct = (value: unknown) => parse(DataProductSchema, value, "data product");
export const parseProviderProfile = (value: unknown) => parse(ProviderProfileSchema, value, "provider profile");
export const parseRecordProductOutcomeRequest = (value: unknown) => parse(RecordProductOutcomeRequestSchema, value, "product outcome");
