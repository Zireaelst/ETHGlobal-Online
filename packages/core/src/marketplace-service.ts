import { randomUUID } from "node:crypto";
import {
  BlockTermsError,
  parseCreateBundleRequest,
  parseProductFilter,
  parseRecordProductOutcomeRequest,
  parseReviewProductRequest,
  parseSubmitProductRequest,
  type CreateBundleRequest,
  type DataProduct,
  type ProductFilter,
  type ProviderMetrics,
  type ProviderProfile,
  type RecordProductOutcomeRequest,
  type ReviewProductRequest,
  type SubmitProductRequest,
} from "@blockterms/contracts";
import type { MarketplaceRepository } from "./marketplace-store";

export interface MarketplaceServiceOptions {
  repository: MarketplaceRepository;
  clock?: () => Date;
  uuid?: () => string;
}

function emptyMetrics(): ProviderMetrics {
  return {
    live: { completed: 0, valid: 0, invalid: 0, late: 0, warranties: 0, totalPaidAtomic: "0" },
    simulation: { completed: 0, valid: 0, invalid: 0, late: 0, warranties: 0 },
  };
}

function percentile(values: number[], percent: number): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil((percent / 100) * sorted.length) - 1);
  return sorted[index];
}

function sameStrings(left: string[], right: string[]): boolean {
  return left.length === right.length && [...left].sort().every((value, index) => value === [...right].sort()[index]);
}

export class MarketplaceService {
  private readonly clock: () => Date;
  private readonly uuid: () => string;
  private outcomeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly options: MarketplaceServiceOptions) {
    this.clock = options.clock ?? (() => new Date());
    this.uuid = options.uuid ?? randomUUID;
  }

  async submitProduct(input: unknown): Promise<DataProduct> {
    let request: SubmitProductRequest;
    try { request = parseSubmitProductRequest(input); } catch { throw new BlockTermsError("VALIDATION_ERROR", "Product validation failed."); }
    const now = this.now();
    const product: DataProduct = { id: this.uuid(), createdAt: now, updatedAt: now, revision: 0, state: "draft", provider: request.provider, manifest: request.manifest };
    const created = await this.options.repository.createProduct(product);
    await this.attachProductToProvider(created);
    return created;
  }

  async reviewProduct(productId: string, input: unknown): Promise<DataProduct> {
    let review: ReviewProductRequest;
    try { review = parseReviewProductRequest(input); } catch { throw new BlockTermsError("VALIDATION_ERROR", "Product review validation failed."); }
    const current = await this.requireProduct(productId);
    const nextState = this.reviewTransition(current, review);
    return this.options.repository.updateProduct(current.id, current.revision, (product) => ({
      ...product,
      state: nextState,
      updatedAt: this.now(),
      review: { curatorId: review.curatorId, reason: review.reason, reviewedAt: this.now(), ...(review.sandbox ? { sandbox: review.sandbox } : {}) },
    }));
  }

  async getProduct(idOrSlug: string): Promise<DataProduct> {
    return this.requireProduct(idOrSlug);
  }

  async listProducts(input: unknown = {}): Promise<DataProduct[]> {
    let filter: ProductFilter;
    try { filter = parseProductFilter(input); } catch { throw new BlockTermsError("VALIDATION_ERROR", "Product filter validation failed."); }
    const query = filter.query?.toLowerCase();
    return (await this.options.repository.listProducts()).filter((product) => {
      if (!filter.includeInactive && product.state !== "active") return false;
      if (query && ![product.manifest.name, product.manifest.summary, product.provider.displayName, product.provider.id, ...product.manifest.tags].join(" ").toLowerCase().includes(query)) return false;
      if (filter.providerType && product.provider.type !== filter.providerType) return false;
      if (filter.schemaFamily && product.manifest.schema.family !== filter.schemaFamily) return false;
      if (filter.network && !product.manifest.networks.includes(filter.network)) return false;
      if (filter.kind && product.manifest.kind !== filter.kind) return false;
      if (filter.maxPriceAtomic && BigInt(product.manifest.commercial.priceAtomic) > BigInt(filter.maxPriceAtomic)) return false;
      if (filter.maxFreshnessSeconds && product.manifest.freshnessSeconds > filter.maxFreshnessSeconds) return false;
      if (filter.minCollateralCoverageBps && product.manifest.commercial.collateralCoverageBps < filter.minCollateralCoverageBps) return false;
      if (filter.credentialKind && !product.manifest.credentials.some((credential) => credential.kind === filter.credentialKind)) return false;
      return true;
    }).slice(0, filter.limit);
  }

  async createBundle(input: unknown): Promise<DataProduct> {
    let request: CreateBundleRequest;
    try { request = parseCreateBundleRequest(input); } catch { throw new BlockTermsError("VALIDATION_ERROR", "Bundle validation failed."); }
    const components = await Promise.all(request.composition.components.map(async (reference) => {
      const product = await this.requireProduct(reference.productId);
      if (product.state !== "active") throw new BlockTermsError("CONFLICT", `Bundle component ${product.id} is not active.`);
      if (product.manifest.version !== reference.version) throw new BlockTermsError("CONFLICT", `Bundle component ${product.id} version does not match.`);
      return product;
    }));
    const first = components[0];
    if (!first) throw new BlockTermsError("VALIDATION_ERROR", "Bundle requires components.");
    for (const component of components.slice(1)) {
      if (component.manifest.schema.family !== first.manifest.schema.family || component.manifest.schema.version !== first.manifest.schema.version) {
        throw new BlockTermsError("VALIDATION_ERROR", "Bundle components must share one schema family and version.");
      }
      if (!sameStrings(component.manifest.networks, first.manifest.networks)) throw new BlockTermsError("VALIDATION_ERROR", "Bundle components must share compatible networks.");
      if (component.manifest.commercial.paymentNetwork !== first.manifest.commercial.paymentNetwork || component.manifest.commercial.asset !== first.manifest.commercial.asset) {
        throw new BlockTermsError("VALIDATION_ERROR", "Bundle components must share one settlement network and asset.");
      }
      if (component.manifest.verification.profile !== first.manifest.verification.profile) {
        throw new BlockTermsError("VALIDATION_ERROR", "Bundle components must share one verification profile.");
      }
    }
    if (request.manifest.schema.family !== first.manifest.schema.family || request.manifest.schema.version !== first.manifest.schema.version || !sameStrings(request.manifest.networks, first.manifest.networks)) {
      throw new BlockTermsError("VALIDATION_ERROR", "Bundle manifest must match component schema and networks.");
    }
    if (request.manifest.commercial.paymentNetwork !== first.manifest.commercial.paymentNetwork || request.manifest.commercial.asset !== first.manifest.commercial.asset) {
      throw new BlockTermsError("VALIDATION_ERROR", "Bundle manifest must match the component settlement network and asset.");
    }
    if (request.manifest.verification.profile !== first.manifest.verification.profile) {
      throw new BlockTermsError("VALIDATION_ERROR", "Bundle manifest must match the component verification profile.");
    }
    const requiredCredentials = components.flatMap((component) => component.manifest.access?.visibility === "credential-gated" ? component.manifest.access.requiredCredentials : []);
    for (const requirement of requiredCredentials) {
      const bundleRequirements = request.manifest.access?.visibility === "credential-gated" ? request.manifest.access.requiredCredentials : [];
      const covered = bundleRequirements.some((candidate) =>
        candidate.kind === requirement.kind
        && candidate.issuer === requirement.issuer
        && candidate.subject === requirement.subject,
      );
      if (!covered) throw new BlockTermsError("VALIDATION_ERROR", "Bundle access policy must cover every component credential requirement.");
    }
    const now = this.now();
    const product: DataProduct = { id: this.uuid(), createdAt: now, updatedAt: now, revision: 0, state: "draft", provider: request.provider, manifest: request.manifest, composition: request.composition };
    const created = await this.options.repository.createProduct(product);
    await this.attachProductToProvider(created);
    return created;
  }

  async listProviders(): Promise<ProviderProfile[]> {
    return this.options.repository.listProviders();
  }

  async getProvider(providerId: string): Promise<ProviderProfile> {
    const profile = await this.options.repository.getProvider(providerId);
    if (!profile) throw new BlockTermsError("NOT_FOUND", `Provider ${providerId} was not found.`);
    return profile;
  }

  recordOutcome(input: unknown): Promise<ProviderProfile> {
    const operation = this.outcomeQueue.catch(() => undefined).then(async () => {
      let outcome: RecordProductOutcomeRequest;
      try { outcome = parseRecordProductOutcomeRequest(input); } catch { throw new BlockTermsError("VALIDATION_ERROR", "Product outcome validation failed."); }
      const product = await this.requireProduct(outcome.productId);
      if (product.provider.id !== outcome.providerId) throw new BlockTermsError("VALIDATION_ERROR", "Outcome provider does not own the product.");
      const profile = await this.getProvider(outcome.providerId);
      if (profile.outcomeOrderIds.includes(outcome.orderId)) return profile;
      const next: ProviderProfile = structuredClone(profile);
      next.outcomeOrderIds.push(outcome.orderId);
      const mode = next.metrics[outcome.mode];
      mode.completed += 1;
      mode[outcome.outcome] += 1;
      if (outcome.warrantyPaid) mode.warranties += 1;
      if (outcome.mode === "live") {
        next.liveLatenciesMs.push(outcome.latencyMs);
        next.metrics.live.totalPaidAtomic = (BigInt(next.metrics.live.totalPaidAtomic) + BigInt(outcome.paidAtomic)).toString();
        next.metrics.live.medianLatencyMs = percentile(next.liveLatenciesMs, 50);
        next.metrics.live.p95LatencyMs = percentile(next.liveLatenciesMs, 95);
      }
      return this.options.repository.putProvider(next);
    });
    this.outcomeQueue = operation.then(() => undefined, () => undefined);
    return operation;
  }

  private async attachProductToProvider(product: DataProduct): Promise<void> {
    const existing = await this.options.repository.getProvider(product.provider.id);
    const profile: ProviderProfile = existing ?? {
      provider: product.provider, productIds: [], credentials: [], outcomeOrderIds: [], liveLatenciesMs: [], metrics: emptyMetrics(),
    };
    if (!profile.productIds.includes(product.id)) profile.productIds.push(product.id);
    for (const credential of product.manifest.credentials) {
      const key = `${credential.kind}:${credential.issuer}:${credential.subject}:${credential.reference}`;
      if (!profile.credentials.some((entry) => `${entry.kind}:${entry.issuer}:${entry.subject}:${entry.reference}` === key)) profile.credentials.push(credential);
    }
    await this.options.repository.putProvider(profile);
  }

  private reviewTransition(product: DataProduct, review: ReviewProductRequest): DataProduct["state"] {
    if (review.decision === "approve") {
      if (product.state !== "draft" && product.state !== "rejected") throw new BlockTermsError("CONFLICT", `Cannot approve a ${product.state} product.`);
      if (!review.sandbox?.passed) throw new BlockTermsError("VALIDATION_ERROR", "Approval requires a passing sandbox review.");
      if (review.sandbox.sampleDigest.toLowerCase() !== product.manifest.sample.digest.toLowerCase()) throw new BlockTermsError("VALIDATION_ERROR", "Sandbox sample digest does not match the manifest.");
      return "active";
    }
    if (review.decision === "reject") {
      if (product.state !== "draft") throw new BlockTermsError("CONFLICT", `Cannot reject a ${product.state} product.`);
      return "rejected";
    }
    if (review.decision === "suspend") {
      if (product.state !== "active") throw new BlockTermsError("CONFLICT", `Cannot suspend a ${product.state} product.`);
      return "suspended";
    }
    if (product.state !== "active" && product.state !== "suspended") throw new BlockTermsError("CONFLICT", `Cannot deprecate a ${product.state} product.`);
    return "deprecated";
  }

  private async requireProduct(idOrSlug: string): Promise<DataProduct> {
    const product = await this.options.repository.getProduct(idOrSlug);
    if (!product) throw new BlockTermsError("NOT_FOUND", `Product ${idOrSlug} was not found.`);
    return product;
  }

  private now(): string { return this.clock().toISOString(); }
}
