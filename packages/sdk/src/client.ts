import type {
  ExecutionResult,
  OrderRecord,
  OrderStatus,
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
  health(): Promise<HealthResponse> { return this.transport.health(); }
  capabilities(): Promise<CapabilitiesResponse> { return this.transport.capabilities(); }
}
