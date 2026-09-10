import { queryStandardizedDeployment } from "./query";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required; no fixture fallback is allowed.`);
  return value;
}

async function main() {
  const endpointA = required("GRAPH_ENDPOINT_A");
  const endpointB = required("GRAPH_ENDPOINT_B");
  if (!/^https?:\/\//.test(endpointA) || !/^https?:\/\//.test(endpointB)) throw new Error("Graph endpoints must be live HTTP(S) URLs.");
  if (endpointA === endpointB) throw new Error("GRAPH_ENDPOINT_A and GRAPH_ENDPOINT_B must be distinct.");
  const labelA = required("GRAPH_LABEL_A");
  const labelB = required("GRAPH_LABEL_B");
  if (labelA === labelB) throw new Error("Graph deployment labels must be distinct.");
  const blockText = required("GRAPH_BLOCK_NUMBER");
  if (!/^\d+$/.test(blockText)) throw new Error("GRAPH_BLOCK_NUMBER must be an explicit non-negative integer.");
  const block = Number(blockText);
  if (!Number.isSafeInteger(block)) throw new Error("GRAPH_BLOCK_NUMBER is outside the safe integer range.");
  const authorization = process.env.GRAPH_AUTHORIZATION?.trim() || undefined;

  const [a, b] = await Promise.all([
    queryStandardizedDeployment({ endpoint: endpointA, label: labelA, block, ...(authorization ? { authorization } : {}) }),
    queryStandardizedDeployment({ endpoint: endpointB, label: labelB, block, ...(authorization ? { authorization } : {}) }),
  ]);
  if (a.snapshot.protocol.id === b.snapshot.protocol.id) throw new Error("Endpoints identified the same protocol deployment.");
  if (a.snapshot.protocol.schemaVersion !== b.snapshot.protocol.schemaVersion) {
    throw new Error("Deployments expose incompatible schema versions.");
  }
  console.log(JSON.stringify({ status: "qualified-read-only", block, deployments: [a.snapshot, b.snapshot] }, null, 2));
  console.log("No payment was created. No fixture data was used.");
}

main().catch((error: unknown) => {
  console.error(`BLOCKED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 2;
});
