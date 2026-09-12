import { BlockTermsError, WitnessResultSchema, type SubmitRequest, type WitnessResult } from "@blockterms/contracts";
import type { AdapterContext, WitnessAdapter } from "@blockterms/core";
import { z } from "zod";

const byteString = z.string().regex(/^0x(?:[0-9a-fA-F]{2})+$/);
const quantity = z.string().regex(/^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/);
const proofSchema = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  accountProof: z.array(byteString).min(1),
  codeHash: byteString,
  storageProof: z.array(z.object({
    key: quantity,
    value: quantity,
    proof: z.array(byteString).min(1),
  })).min(1).max(3),
}).passthrough();
const headerSchema = z.object({
  number: quantity,
  hash: byteString,
  stateRoot: byteString,
}).passthrough();

export interface EvmWitnessAdapterOptions {
  rpcUrl: string;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
}

function proofBytes(nodes: string[]): number {
  return nodes.reduce((total, node) => total + (node.length - 2) / 2, 0);
}

function normalizedQuantity(value: string): string {
  return BigInt(value).toString(16);
}

export class EvmWitnessAdapter implements WitnessAdapter {
  private readonly timeoutMs: number;
  private readonly fetchImplementation: typeof globalThis.fetch;

  constructor(private readonly options: EvmWitnessAdapterOptions) {
    this.timeoutMs = options.timeoutMs ?? 8_000;
    this.fetchImplementation = options.fetch ?? globalThis.fetch;
  }

  async fetch(request: SubmitRequest["witness"], context: AdapterContext): Promise<WitnessResult> {
    const timeoutSignal = AbortSignal.timeout(this.timeoutMs);
    const signal = AbortSignal.any([context.signal, timeoutSignal]);
    try {
      const [proofValue, headerValue] = await Promise.all([
        this.rpc(1, "eth_getProof", [request.address, request.slots, request.block], signal),
        this.rpc(2, "eth_getBlockByNumber", [request.block, false], signal),
      ]);
      const proof = proofSchema.safeParse(proofValue);
      if (!proof.success) throw new BlockTermsError("UPSTREAM_ERROR", "EVM RPC returned a malformed proof node set.");
      const header = headerSchema.safeParse(headerValue);
      if (!header.success) throw new BlockTermsError("UPSTREAM_ERROR", "EVM RPC returned a malformed pinned block header.");
      if (proof.data.address.toLowerCase() !== request.address.toLowerCase()) {
        throw new BlockTermsError("UPSTREAM_ERROR", "EVM proof account does not match the requested account.");
      }
      if (normalizedQuantity(header.data.number) !== normalizedQuantity(request.block)) {
        throw new BlockTermsError("UPSTREAM_ERROR", "EVM header does not match the requested pinned block.");
      }
      const requestedSlots = request.slots.map(normalizedQuantity);
      const returnedSlots = proof.data.storageProof.map((entry) => normalizedQuantity(entry.key));
      if (
        requestedSlots.length !== returnedSlots.length
        || requestedSlots.some((slot) => !returnedSlots.includes(slot))
        || new Set(returnedSlots).size !== returnedSlots.length
      ) {
        throw new BlockTermsError("UPSTREAM_ERROR", "EVM proof does not contain the exact requested slot set.");
      }
      const bySlot = new Map(proof.data.storageProof.map((entry) => [normalizedQuantity(entry.key), entry]));
      const storageValues = Object.fromEntries(
        request.slots.map((slot) => [slot, bySlot.get(normalizedQuantity(slot))?.value]),
      );
      return WitnessResultSchema.parse({
        network: request.network,
        address: request.address,
        blockNumber: Number.parseInt(request.block.slice(2), 16),
        accountProofBytes: proofBytes(proof.data.accountProof),
        storageProofBytes: proof.data.storageProof.reduce((total, entry) => total + proofBytes(entry.proof), 0),
        slotCount: proof.data.storageProof.length,
        codeHash: proof.data.codeHash,
        storageValues,
      });
    } catch (error) {
      if (error instanceof BlockTermsError) throw error;
      if (timeoutSignal.aborted) {
        throw new BlockTermsError("UPSTREAM_ERROR", "EVM witness request timed out.", { retryable: true });
      }
      if (context.signal.aborted) {
        throw new BlockTermsError("UPSTREAM_ERROR", "EVM witness request was aborted.", { retryable: true });
      }
      throw new BlockTermsError("UPSTREAM_ERROR", "EVM witness request failed.", { retryable: true });
    }
  }

  private async rpc(id: number, method: string, params: unknown[], signal: AbortSignal): Promise<unknown> {
    const response = await this.fetchImplementation(this.options.rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
      signal,
    });
    if (!response.ok) {
      throw new BlockTermsError("UPSTREAM_ERROR", `EVM RPC returned HTTP ${response.status}.`, {
        retryable: response.status >= 500,
      });
    }
    const envelope: unknown = await response.json();
    if (!envelope || typeof envelope !== "object") {
      throw new BlockTermsError("UPSTREAM_ERROR", "EVM RPC returned an invalid JSON-RPC response.");
    }
    const record = envelope as { error?: unknown; result?: unknown };
    if (record.error !== undefined) throw new BlockTermsError("UPSTREAM_ERROR", "EVM RPC returned a JSON-RPC error.");
    if (!("result" in record)) throw new BlockTermsError("UPSTREAM_ERROR", "EVM RPC response omitted its result.");
    return record.result;
  }
}
