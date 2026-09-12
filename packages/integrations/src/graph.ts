import { BlockTermsError, GraphSnapshotSchema, type GraphSnapshot, type SubmitRequest } from "@blockterms/contracts";
import type { AdapterContext, GraphAdapter } from "@blockterms/core";
import { z } from "zod";

export const STANDARDIZED_GRAPH_QUERY = `query StandardizedSnapshot($block: Int!, $poolLimit: Int!) {
  protocol(id: "1", block: { number: $block }) {
    id
    name
    network
    schemaVersion
    subgraphVersion
    methodologyVersion
  }
  pools(first: $poolLimit, orderBy: id, orderDirection: asc, block: { number: $block }) {
    id
    inputTokenIds
    inputTokenBalances
  }
  _meta(block: { number: $block }) { block { number hash } }
}`;

const integerString = z.string().regex(/^\d+$/);
const graphDataSchema = z.object({
  protocol: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    network: z.string().min(1),
    schemaVersion: z.string().min(1),
    subgraphVersion: z.string().min(1),
    methodologyVersion: z.string().min(1),
  }),
  pools: z.array(z.object({
    id: z.string().min(1),
    inputTokenIds: z.array(z.string().min(1)),
    inputTokenBalances: z.array(integerString),
  })).max(3),
  _meta: z.object({
    block: z.object({ number: z.number().int().nonnegative(), hash: z.string().min(1).optional() }),
  }),
});

export interface GraphDeployment {
  endpoint: string;
  label: string;
}

export interface GraphStandardizedAdapterOptions {
  deployments: readonly [GraphDeployment, GraphDeployment];
  authorization?: string;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
}

export class GraphStandardizedAdapter implements GraphAdapter {
  private readonly timeoutMs: number;
  private readonly fetchImplementation: typeof globalThis.fetch;

  constructor(private readonly options: GraphStandardizedAdapterOptions) {
    if (options.deployments[0].endpoint === options.deployments[1].endpoint) {
      throw new BlockTermsError("VALIDATION_ERROR", "Graph deployments must use distinct endpoints.");
    }
    this.timeoutMs = options.timeoutMs ?? 8_000;
    this.fetchImplementation = options.fetch ?? globalThis.fetch;
  }

  async fetch(request: SubmitRequest["query"], context: AdapterContext): Promise<GraphSnapshot[]> {
    const snapshots = await Promise.all(
      this.options.deployments.map((deployment) => this.queryDeployment(deployment, request, context)),
    );
    const versions = new Set(snapshots.map((snapshot) => snapshot.protocol.schemaVersion));
    if (versions.size !== 1) {
      throw new BlockTermsError("UPSTREAM_ERROR", "Graph deployments returned incompatible schema versions.");
    }
    return snapshots;
  }

  private async queryDeployment(
    deployment: GraphDeployment,
    request: SubmitRequest["query"],
    context: AdapterContext,
  ): Promise<GraphSnapshot> {
    const timeoutSignal = AbortSignal.timeout(this.timeoutMs);
    const signal = AbortSignal.any([context.signal, timeoutSignal]);
    const body = {
      query: STANDARDIZED_GRAPH_QUERY,
      variables: { block: request.blockNumber, poolLimit: request.poolLimit },
    };
    try {
      const response = await this.fetchImplementation(deployment.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(this.options.authorization ? { authorization: this.options.authorization } : {}),
        },
        body: JSON.stringify(body),
        signal,
      });
      if (!response.ok) {
        throw new BlockTermsError("UPSTREAM_ERROR", `${deployment.label} returned HTTP ${response.status}.`, {
          retryable: response.status >= 500,
        });
      }
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object") {
        throw new BlockTermsError("UPSTREAM_ERROR", `${deployment.label} returned an invalid GraphQL response.`);
      }
      const envelope = payload as { data?: unknown; errors?: unknown };
      if (envelope.errors !== undefined) {
        throw new BlockTermsError("UPSTREAM_ERROR", `${deployment.label} GraphQL response included errors.`);
      }
      const parsed = graphDataSchema.safeParse(envelope.data);
      if (!parsed.success) {
        throw new BlockTermsError("UPSTREAM_ERROR", `${deployment.label} returned an invalid standardized response.`);
      }
      if (parsed.data._meta.block.number !== request.blockNumber) {
        throw new BlockTermsError("UPSTREAM_ERROR", `${deployment.label} returned a different pinned block.`);
      }
      if (parsed.data.pools.length > request.poolLimit) {
        throw new BlockTermsError("UPSTREAM_ERROR", `${deployment.label} exceeded the requested pool limit.`);
      }
      for (const pool of parsed.data.pools) {
        if (pool.inputTokenIds.length !== pool.inputTokenBalances.length) {
          throw new BlockTermsError("UPSTREAM_ERROR", `${deployment.label} returned mismatched token and balance arrays.`);
        }
      }
      const blockHash = parsed.data._meta.block.hash;
      return GraphSnapshotSchema.parse({
        source: "graph",
        deploymentLabel: deployment.label,
        protocol: parsed.data.protocol,
        block: { number: request.blockNumber, ...(blockHash ? { hash: blockHash } : {}) },
        pools: parsed.data.pools,
      });
    } catch (error) {
      if (error instanceof BlockTermsError) throw error;
      if (timeoutSignal.aborted) {
        throw new BlockTermsError("UPSTREAM_ERROR", `${deployment.label} Graph request timed out.`, { retryable: true });
      }
      if (context.signal.aborted) {
        throw new BlockTermsError("UPSTREAM_ERROR", `${deployment.label} Graph request was aborted.`, { retryable: true });
      }
      throw new BlockTermsError("UPSTREAM_ERROR", `${deployment.label} Graph request failed.`, { retryable: true });
    }
  }
}
