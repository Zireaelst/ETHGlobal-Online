import { randomUUID } from "node:crypto";
import {
  BlockTermsError,
  ExecutionResultSchema,
  parseSubmitRequest,
  type ExecutionResult,
  type OrderEvent,
  type OrderRecord,
  type OrderStatus,
  type SafeError,
  type SubmitRequest,
} from "@blockterms/contracts";
import { inspectLiveConfiguration, resolveExecutionMode, type RuntimeConfig } from "./config";
import type { AdapterSet } from "./ports";
import type { OrderRepository } from "./store";

export interface BlockTermsServiceOptions {
  repository: OrderRepository;
  adapters: AdapterSet;
  config: RuntimeConfig;
  clock?: () => Date;
  uuid?: () => string;
}

export interface HealthResponse {
  status: "ok";
  service: "blockterms";
  version: "0.1.0";
}

export interface CapabilitiesResponse {
  modes: ["simulation", "live"];
  live: { ready: boolean; missing: string[] };
  interfaces: ["sdk", "http", "cli", "mcp"];
  limits: { pools: 3; storageSlots: 3; metadataBytes: 8192; listOrders: 100 };
}

function asSafeExecutionError(error: unknown): SafeError {
  if (error instanceof BlockTermsError) return error.toSafeError();
  return {
    code: "UPSTREAM_ERROR",
    message: "Execution failed in an upstream adapter.",
    retryable: false,
  };
}

export class BlockTermsService {
  private readonly clock: () => Date;
  private readonly uuid: () => string;

  constructor(private readonly options: BlockTermsServiceOptions) {
    this.clock = options.clock ?? (() => new Date());
    this.uuid = options.uuid ?? randomUUID;
  }

  async submit(input: unknown): Promise<OrderRecord> {
    let request: SubmitRequest;
    try {
      request = parseSubmitRequest(input);
    } catch {
      throw new BlockTermsError("VALIDATION_ERROR", "Request validation failed.");
    }
    const id = this.uuid();
    const now = this.now();
    const explicitMode = request.mode === "auto" ? undefined : request.mode;
    const record: OrderRecord = {
      id,
      createdAt: now,
      updatedAt: now,
      revision: 0,
      phase: "queued",
      requestedMode: request.mode,
      fallbackReasons: [],
      request,
      protocolState: { kind: "quoted", orderId: id, ...(explicitMode ? { mode: explicitMode } : {}) },
      events: [this.event("order.submitted")],
    };
    return this.options.repository.create(record);
  }

  async run(id: string): Promise<OrderRecord> {
    let current = await this.getOrder(id);
    if (current.phase !== "queued" && current.phase !== "configuration_required") {
      throw new BlockTermsError("CONFLICT", `Order ${id} cannot run from phase ${current.phase}.`);
    }

    let selection;
    try {
      selection = resolveExecutionMode(current.requestedMode, this.options.config);
    } catch (error) {
      if (!(error instanceof BlockTermsError) || error.code !== "CONFIGURATION_REQUIRED") throw error;
      return this.options.repository.update(id, current.revision, (record) => ({
        ...record,
        phase: "configuration_required",
        updatedAt: this.now(),
        error: error.toSafeError(),
        events: [...record.events, this.event("execution.configuration_required", {
          missing: error.missing ?? [],
        })],
      }));
    }

    const executionAdapters = selection.selectedMode === "live"
      ? this.options.adapters.live
      : this.options.adapters.simulation;
    if (!executionAdapters) {
      const configurationError = new BlockTermsError(
        "CONFIGURATION_REQUIRED",
        "Live adapters are not configured.",
        { missing: ["LIVE_ADAPTERS"] },
      );
      return this.options.repository.update(id, current.revision, (record) => ({
        ...record,
        phase: "configuration_required",
        updatedAt: this.now(),
        error: configurationError.toSafeError(),
        events: [...record.events, this.event("execution.configuration_required", { missing: ["LIVE_ADAPTERS"] })],
      }));
    }

    current = await this.options.repository.update(id, current.revision, (record) => {
      const { error: _error, result: _result, ...base } = record;
      return {
        ...base,
        phase: "running",
        selectedMode: selection.selectedMode,
        fallbackReasons: selection.fallbackReasons,
        updatedAt: this.now(),
        protocolState: { kind: "reserved", orderId: id, mode: selection.selectedMode },
        events: [...record.events, this.event("execution.started", {
          mode: selection.selectedMode,
          fallbackReasons: selection.fallbackReasons,
        })],
      };
    });

    const signal = AbortSignal.timeout(current.request.policy.deadlineMs);
    try {
      const context = { orderId: id, signal };
      const [graph, witness] = await Promise.all([
        executionAdapters.graph.fetch(current.request.query, context),
        executionAdapters.witness.fetch(current.request.witness, context),
      ]);
      const paymentId = `payment_${this.uuid()}`;
      current = await this.options.repository.update(id, current.revision, (record) => ({
        ...record,
        updatedAt: this.now(),
        protocolState: {
          kind: "payment-pending",
          orderId: id,
          mode: selection.selectedMode,
          paymentId,
          reconciledUnpaid: false,
        },
        events: [...record.events, this.event("payment.started", { paymentId })],
      }));
      const payment = await executionAdapters.payment.pay(current.request.policy, context);
      current = await this.options.repository.update(id, current.revision, (record) => ({
        ...record,
        updatedAt: this.now(),
        protocolState: {
          kind: "paid",
          orderId: id,
          mode: selection.selectedMode,
          originalPaymentReceiptId: payment.receiptId,
        },
        events: [...record.events, this.event("payment.settled", {
          receiptId: payment.receiptId,
          network: payment.network,
          amountAtomic: payment.amountAtomic,
        })],
      }));
      const deliveryId = `delivery_${this.uuid()}`;
      const result: ExecutionResult = ExecutionResultSchema.parse({
        mode: selection.selectedMode,
        graph,
        witness,
        payment,
        decision: "accepted",
        deliveryId,
        completedAt: this.now(),
      });
      return this.options.repository.update(id, current.revision, (record) => ({
        ...record,
        phase: "completed",
        updatedAt: this.now(),
        result,
        protocolState: { kind: "accepted", orderId: id, mode: selection.selectedMode, deliveryId },
        events: [...record.events, this.event("delivery.accepted", { deliveryId })],
      }));
    } catch (error) {
      const safeError = asSafeExecutionError(error);
      return this.options.repository.update(id, current.revision, (record) => ({
        ...record,
        phase: "failed",
        updatedAt: this.now(),
        error: safeError,
        events: [...record.events, this.event("execution.failed", {
          code: safeError.code,
          retryable: safeError.retryable,
        })],
      }));
    }
  }

  async getOrder(id: string): Promise<OrderRecord> {
    const order = await this.options.repository.get(id);
    if (!order) throw new BlockTermsError("NOT_FOUND", `Order ${id} was not found.`);
    return order;
  }

  async getStatus(id: string): Promise<OrderStatus> {
    const order = await this.getOrder(id);
    return {
      id: order.id,
      phase: order.phase,
      requestedMode: order.requestedMode,
      fallbackReasons: order.fallbackReasons,
      updatedAt: order.updatedAt,
      ...(order.selectedMode ? { selectedMode: order.selectedMode } : {}),
      ...(order.error ? { error: order.error } : {}),
    };
  }

  async getResult(id: string): Promise<ExecutionResult> {
    const order = await this.getOrder(id);
    if (!order.result) throw new BlockTermsError("CONFLICT", `Order ${id} does not have a completed result.`);
    return order.result;
  }

  async listOrders(options: { limit?: number } = {}): Promise<OrderRecord[]> {
    const limit = options.limit ?? 50;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BlockTermsError("VALIDATION_ERROR", "Order list limit must be an integer from 1 to 100.");
    }
    return (await this.options.repository.list()).slice(-limit).reverse();
  }

  async health(): Promise<HealthResponse> {
    await this.options.repository.list();
    return { status: "ok", service: "blockterms", version: "0.1.0" };
  }

  async capabilities(): Promise<CapabilitiesResponse> {
    const live = inspectLiveConfiguration(this.options.config);
    return {
      modes: ["simulation", "live"],
      live: { ready: live.liveReady && Boolean(this.options.adapters.live), missing: [...live.missing] },
      interfaces: ["sdk", "http", "cli", "mcp"],
      limits: { pools: 3, storageSlots: 3, metadataBytes: 8192, listOrders: 100 },
    };
  }

  private now(): string {
    return this.clock().toISOString();
  }

  private event(type: string, detail?: NonNullable<OrderEvent["detail"]>): OrderEvent {
    return { at: this.now(), type, ...(detail ? { detail } : {}) };
  }
}
