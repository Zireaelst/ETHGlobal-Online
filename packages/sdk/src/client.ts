import type {
  CreateBundleRequest,
  DataProduct,
  ExecutionResult,
  OrderRecord,
  OrderStatus,
  ProductFilter,
  ProviderProfile,
  RecordProductOutcomeRequest,
  ReviewProductRequest,
  SubmitProductRequest,
  SubmitRequest,
} from "@blockterms/contracts";
import type { CapabilitiesResponse, HealthResponse } from "@blockterms/core";

export interface ListOrdersOptions {
  limit?: number;
}

export interface BlockTermsTransport {
  submit(input: SubmitRequest): Promise<OrderRecord>;
  run(orderId: string): Promise<OrderRecord>;
  getOrder(orderId: string): Promise<OrderRecord>;
  getStatus(orderId: string): Promise<OrderStatus>;
  getResult(orderId: string): Promise<ExecutionResult>;
  listOrders(options?: ListOrdersOptions): Promise<OrderRecord[]>;
  submitProduct(input: SubmitProductRequest): Promise<DataProduct>;
  reviewProduct(productId: string, input: ReviewProductRequest): Promise<DataProduct>;
  getProduct(idOrSlug: string): Promise<DataProduct>;
  listProducts(filter?: ProductFilter): Promise<DataProduct[]>;
  createBundle(input: CreateBundleRequest): Promise<DataProduct>;
  listProviders(): Promise<ProviderProfile[]>;
  getProvider(providerId: string): Promise<ProviderProfile>;
  recordOutcome(input: RecordProductOutcomeRequest): Promise<ProviderProfile>;
  health(): Promise<HealthResponse>;
  capabilities(): Promise<CapabilitiesResponse>;
}

export class BlockTermsClient implements BlockTermsTransport {
  constructor(private readonly transport: BlockTermsTransport) {}

  submit(input: SubmitRequest): Promise<OrderRecord> { return this.transport.submit(input); }
  run(orderId: string): Promise<OrderRecord> { return this.transport.run(orderId); }
  getOrder(orderId: string): Promise<OrderRecord> { return this.transport.getOrder(orderId); }
  getStatus(orderId: string): Promise<OrderStatus> { return this.transport.getStatus(orderId); }
  getResult(orderId: string): Promise<ExecutionResult> { return this.transport.getResult(orderId); }
  listOrders(options?: ListOrdersOptions): Promise<OrderRecord[]> { return this.transport.listOrders(options); }
  submitProduct(input: SubmitProductRequest): Promise<DataProduct> { return this.transport.submitProduct(input); }
  reviewProduct(productId: string, input: ReviewProductRequest): Promise<DataProduct> { return this.transport.reviewProduct(productId, input); }
  getProduct(idOrSlug: string): Promise<DataProduct> { return this.transport.getProduct(idOrSlug); }
  listProducts(filter?: ProductFilter): Promise<DataProduct[]> { return this.transport.listProducts(filter); }
  createBundle(input: CreateBundleRequest): Promise<DataProduct> { return this.transport.createBundle(input); }
  listProviders(): Promise<ProviderProfile[]> { return this.transport.listProviders(); }
  getProvider(providerId: string): Promise<ProviderProfile> { return this.transport.getProvider(providerId); }
  recordOutcome(input: RecordProductOutcomeRequest): Promise<ProviderProfile> { return this.transport.recordOutcome(input); }
  health(): Promise<HealthResponse> { return this.transport.health(); }
  capabilities(): Promise<CapabilitiesResponse> { return this.transport.capabilities(); }
}
