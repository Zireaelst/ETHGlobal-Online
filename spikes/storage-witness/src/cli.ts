import { buildGetProofRequest } from "./request";
import { assertProofResponse, measureWitness } from "./measure";

type RpcEnvelope = { result?: unknown; error?: { message?: string } };

function option(name: string, repeat = false): string | string[] {
  const args = process.argv.slice(2);
  const values = args.flatMap((value, index) => value === name && args[index + 1] ? [args[index + 1] as string] : []);
  if (repeat) return values;
  if (values.length !== 1) throw new Error(`${name} must be supplied exactly once.`);
  return values[0] as string;
}

async function rpc(url: string, body: unknown): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`RPC returned HTTP ${response.status}.`);
  const envelope = await response.json() as RpcEnvelope;
  if (envelope.error) throw new Error(`RPC error: ${envelope.error.message ?? "unknown"}`);
  if (envelope.result === undefined || envelope.result === null) throw new Error("RPC response did not include a result.");
  return envelope.result;
}

async function main() {
  const rpcUrl = process.env.SOURCE_RPC_URL?.trim();
  if (!rpcUrl) throw new Error("SOURCE_RPC_URL is required; no public RPC fallback will be selected.");
  const address = option("--address") as string;
  const block = option("--block") as string;
  const slots = option("--slot", true) as string[];
  const request = buildGetProofRequest(address, slots, block);
  const [proof, header] = await Promise.all([
    rpc(rpcUrl, request),
    rpc(rpcUrl, { jsonrpc: "2.0", id: 2, method: "eth_getBlockByNumber", params: [block, false] }),
  ]);
  assertProofResponse(proof);
  if (proof.address.toLowerCase() !== address.toLowerCase()) throw new Error("Proof address does not match the requested pool.");
  if (proof.storageProof.length !== slots.length) throw new Error("Proof slot count does not match the bounded request.");
  if (typeof header !== "object" || header === null || (header as { number?: unknown }).number !== block) {
    throw new Error("Returned header does not match the pinned block.");
  }
  console.log(JSON.stringify(measureWitness(proof, Number.parseInt(block.slice(2), 16)), null, 2));
  console.log("Witness fetched but not accepted: no independent checkpoint or Hedera verifier was used.");
}

main().catch((error: unknown) => {
  console.error(`BLOCKED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 2;
});
