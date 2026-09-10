export type ProofResponse = {
  address: string;
  accountProof: string[];
  balance: string;
  codeHash: string;
  nonce: string;
  storageHash: string;
  storageProof: Array<{ key: string; value: string; proof: string[] }>;
};

function proofBytes(values: string[]): number {
  return values.reduce((total, value) => {
    if (!/^0x(?:[0-9a-fA-F]{2})*$/.test(value)) throw new Error("Proof nodes must be even-length hex bytes.");
    return total + (value.length - 2) / 2;
  }, 0);
}

export function assertProofResponse(value: unknown): asserts value is ProofResponse {
  if (typeof value !== "object" || value === null) throw new Error("eth_getProof result must be an object.");
  const proof = value as Partial<ProofResponse>;
  if (typeof proof.address !== "string" || !Array.isArray(proof.accountProof) || proof.accountProof.length === 0) {
    throw new Error("eth_getProof result is missing an account proof.");
  }
  if (!Array.isArray(proof.storageProof) || proof.storageProof.length < 1 || proof.storageProof.length > 3) {
    throw new Error("eth_getProof result must contain one to three storage proofs.");
  }
  if (typeof proof.codeHash !== "string" || !proof.storageProof.every((item) => item && Array.isArray(item.proof))) {
    throw new Error("eth_getProof result contains malformed proof fields.");
  }
  proofBytes(proof.accountProof);
  for (const item of proof.storageProof) proofBytes(item.proof);
}

export function measureWitness(proof: ProofResponse, blockNumber: number) {
  assertProofResponse(proof);
  return {
    accountProofBytes: proofBytes(proof.accountProof),
    storageProofBytes: proof.storageProof.reduce((sum, slot) => sum + proofBytes(slot.proof), 0),
    slotCount: proof.storageProof.length,
    blockNumber,
    codeHash: proof.codeHash,
  };
}
