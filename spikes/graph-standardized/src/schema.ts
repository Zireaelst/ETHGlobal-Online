import { z } from "zod";

const integerString = z.string().regex(/^\d+$/, "Reserve must be a non-negative base-10 integer string.");

const graphResponseSchema = z.object({
  protocol: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    network: z.string().min(1),
    schemaVersion: z.string({ error: "schemaVersion is required" }).min(1),
    subgraphVersion: z.string({ error: "subgraphVersion is required" }).min(1),
    methodologyVersion: z.string({ error: "methodologyVersion is required" }).min(1),
  }),
  _meta: z.object({ block: z.object({ number: z.number().int().nonnegative(), hash: z.string().min(1).optional() }) }),
  pools: z.array(z.object({
    id: z.string().min(1),
    inputTokenIds: z.array(z.string().min(1)),
    inputTokenBalances: z.array(integerString),
  })).max(5),
});

export type StandardizedProtocolSnapshot = {
  source: "graph";
  deploymentLabel: string;
  protocol: {
    id: string;
    name: string;
    network: string;
    schemaVersion: string;
    subgraphVersion: string;
    methodologyVersion: string;
  };
  block: { number: number; hash?: string };
  pools: Array<{ id: string; inputTokenIds: string[]; inputTokenBalances: string[] }>;
};

export function parseStandardizedSnapshot(
  value: unknown,
  deploymentLabel: string,
  requestedBlock: number,
): StandardizedProtocolSnapshot {
  const parsed = graphResponseSchema.safeParse(value);
  if (!parsed.success) throw new Error(`Standardized response validation failed: ${parsed.error.message}`);
  if (parsed.data._meta.block.number !== requestedBlock) {
    throw new Error(`Response block ${parsed.data._meta.block.number} does not match requested block ${requestedBlock}.`);
  }
  for (const pool of parsed.data.pools) {
    if (pool.inputTokenIds.length !== pool.inputTokenBalances.length) {
      throw new Error(`Pool ${pool.id} token and balance arrays must have the same length.`);
    }
  }
  const hash = parsed.data._meta.block.hash;
  return {
    source: "graph",
    deploymentLabel,
    protocol: parsed.data.protocol,
    block: hash === undefined ? { number: requestedBlock } : { number: requestedBlock, hash },
    pools: parsed.data.pools,
  };
}
