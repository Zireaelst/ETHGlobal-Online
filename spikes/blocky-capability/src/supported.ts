import { z } from "zod";

const capabilitySchema = z.object({
  scheme: z.string(),
  network: z.string(),
  x402Version: z.number().int(),
  extra: z.object({ feePayer: z.string().min(1).optional() }).passthrough().optional(),
}).passthrough();

const supportedSchema = z.object({
  kinds: z.array(capabilitySchema),
  signers: z.record(z.string(), z.array(z.string())).optional(),
}).passthrough();

export type HederaCapability = {
  scheme: "exact";
  network: "hedera:testnet";
  x402Version: 2;
  feePayer: string;
};

export function findHederaTestnetCapability(value: unknown): HederaCapability {
  const parsed = supportedSchema.safeParse(value);
  if (!parsed.success) throw new Error(`Malformed /supported response: ${parsed.error.message}`);

  const networkMatches = parsed.data.kinds.filter((kind) => kind.network === "hedera:testnet");
  if (networkMatches.length === 0) throw new Error("No hedera:testnet capability was advertised.");
  const versionMatches = networkMatches.filter((kind) => kind.x402Version === 2);
  if (versionMatches.length === 0) throw new Error("Hedera testnet capability is not x402 v2.");
  const exact = versionMatches.find((kind) => kind.scheme === "exact");
  if (!exact) throw new Error("Hedera testnet x402 v2 does not advertise the exact scheme.");

  const feePayer = exact.extra?.feePayer ?? parsed.data.signers?.["hedera:*"]?.[0];
  if (!feePayer) throw new Error("Hedera testnet capability is missing a fee payer.");
  return { scheme: "exact", network: "hedera:testnet", x402Version: 2, feePayer };
}
