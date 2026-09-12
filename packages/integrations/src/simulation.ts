import { createHash } from "node:crypto";
import {
  GraphSnapshotSchema,
  PaymentReceiptSchema,
  WitnessResultSchema,
  type GraphSnapshot,
  type PaymentReceipt,
  type SubmitRequest,
  type WitnessResult,
} from "@blockterms/contracts";
import type { AdapterContext, ExecutionAdapters } from "@blockterms/core";

const simulationTimestamp = "2026-09-12T00:00:00.000Z";

function digest(...parts: string[]): string {
  return createHash("sha256").update(parts.join("\u001f")).digest("hex");
}

function checkSignal(context: AdapterContext): void {
  if (context.signal.aborted) throw context.signal.reason ?? new Error("Simulation operation aborted.");
}

function pools(deployment: string, limit: number): GraphSnapshot["pools"] {
  return Array.from({ length: limit }, (_, index) => ({
    id: `sim_pool_${digest(deployment, String(index)).slice(0, 16)}`,
    inputTokenIds: [`sim_token_${index}_a`, `sim_token_${index}_b`],
    inputTokenBalances: [String(1_000_000 * (index + 1)), String(2_000_000 * (index + 1))],
  }));
}

class SimulationGraphAdapter {
  async fetch(request: SubmitRequest["query"], context: AdapterContext): Promise<GraphSnapshot[]> {
    checkSignal(context);
    return ["simulation-a", "simulation-b"].map((deploymentLabel, index) =>
      GraphSnapshotSchema.parse({
        source: "graph",
        deploymentLabel,
        protocol: {
          id: `sim_protocol_${index + 1}`,
          name: `BlockTerms Simulation ${index + 1}`,
          network: "simulation",
          schemaVersion: "messari-standard-v1",
          subgraphVersion: "sim-v1",
          methodologyVersion: "sim-v1",
        },
        block: { number: request.blockNumber },
        pools: pools(deploymentLabel, request.poolLimit),
      }),
    );
  }
}

class SimulationWitnessAdapter {
  async fetch(request: SubmitRequest["witness"], context: AdapterContext): Promise<WitnessResult> {
    checkSignal(context);
    const storageValues = Object.fromEntries(
      request.slots.map((slot) => [slot, `0x${digest(request.network, request.address, request.block, slot)}`]),
    );
    return WitnessResultSchema.parse({
      network: request.network,
      address: request.address,
      blockNumber: Number.parseInt(request.block.slice(2), 16),
      accountProofBytes: 512 + request.slots.length * 32,
      storageProofBytes: request.slots.length * 384,
      slotCount: request.slots.length,
      codeHash: `sim_${digest(request.network, request.address).slice(0, 32)}`,
      storageValues,
    });
  }
}

class SimulationPaymentAdapter {
  async pay(request: SubmitRequest["policy"], context: AdapterContext): Promise<PaymentReceipt> {
    checkSignal(context);
    const amountAtomic = String(BigInt(request.maxPaymentAtomic) < 100n ? BigInt(request.maxPaymentAtomic) : 100n);
    const network = request.allowedPaymentNetworks[0] ?? "simulation";
    return PaymentReceiptSchema.parse({
      receiptId: `sim_${digest(context.orderId, request.resourceUrl, network, amountAtomic).slice(0, 24)}`,
      network,
      amountAtomic,
      asset: "simulated-asset",
      observedAt: simulationTimestamp,
    });
  }
}

export function createSimulationAdapters(): ExecutionAdapters {
  return {
    graph: new SimulationGraphAdapter(),
    witness: new SimulationWitnessAdapter(),
    payment: new SimulationPaymentAdapter(),
  };
}
