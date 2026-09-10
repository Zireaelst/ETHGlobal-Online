import { parseStandardizedSnapshot, type StandardizedProtocolSnapshot } from "./schema";

export const STANDARDIZED_QUERY = `query StandardizedSnapshot($block: Int!) {
  protocol(id: "1", block: { number: $block }) {
    id
    name
    network
    schemaVersion
    subgraphVersion
    methodologyVersion
  }
  pools(first: 3, orderBy: id, orderDirection: asc, block: { number: $block }) {
    id
    inputTokenIds
    inputTokenBalances
  }
  _meta(block: { number: $block }) { block { number hash } }
}`;

export type QueryCapture = {
  snapshot: StandardizedProtocolSnapshot;
  request: { query: string; variables: { block: number } };
  response: unknown;
};

export async function queryStandardizedDeployment(input: {
  endpoint: string;
  label: string;
  block: number;
  authorization?: string;
}): Promise<QueryCapture> {
  const request = { query: STANDARDIZED_QUERY, variables: { block: input.block } };
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (input.authorization) headers.authorization = input.authorization;
  const response = await fetch(input.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`${input.label} returned HTTP ${response.status}.`);
  const payload: unknown = await response.json();
  if (typeof payload !== "object" || payload === null) throw new Error(`${input.label} returned a non-object response.`);
  const record = payload as { data?: unknown; errors?: unknown };
  if (record.errors !== undefined) throw new Error(`${input.label} GraphQL response included errors.`);
  if (record.data === undefined) throw new Error(`${input.label} response did not include data.`);
  return { snapshot: parseStandardizedSnapshot(record.data, input.label, input.block), request, response: record.data };
}
