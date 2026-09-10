export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: 1;
  method: "eth_getProof";
  params: [string, string[], string];
};

const addressPattern = /^0x[0-9a-fA-F]{40}$/;
const quantityPattern = /^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/;

export function buildGetProofRequest(address: string, slots: string[], block: string): JsonRpcRequest {
  if (!addressPattern.test(address)) throw new Error("Pool address must be an exact 20-byte hex value.");
  if (slots.length < 1 || slots.length > 3) throw new Error("Provide one to three storage slots.");
  if (new Set(slots.map((slot) => slot.toLowerCase())).size !== slots.length) throw new Error("Storage slots cannot contain duplicate values.");
  if (!slots.every((slot) => quantityPattern.test(slot))) throw new Error("Every storage slot must be a canonical hex quantity.");
  if (!quantityPattern.test(block)) throw new Error("The probe requires a pinned numeric block hex quantity.");
  return { jsonrpc: "2.0", id: 1, method: "eth_getProof", params: [address, slots, block] };
}
