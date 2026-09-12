import { BlockTermsError, PaymentReceiptSchema, type PaymentReceipt, type SubmitRequest } from "@blockterms/contracts";
import { x402Client } from "@x402/core/client";
import { decodePaymentResponseHeader } from "@x402/core/http";
import type { PaymentRequirements } from "@x402/core/types";
import { wrapFetchWithPayment } from "@x402/fetch";
import { createClientHederaSigner, PrivateKey } from "@x402/hedera";
import { ExactHederaScheme } from "@x402/hedera/exact/client";
import type { AdapterContext, PaymentAdapter } from "@blockterms/core";

export interface PaymentSelectionPolicy {
  maxPaymentAtomic: string;
  allowedPaymentNetworks: string[];
  expectedPayee: string;
  expectedAsset: string;
}

function requireCandidates(
  candidates: PaymentRequirements[],
  message: string,
): PaymentRequirements[] {
  if (candidates.length === 0) throw new BlockTermsError("POLICY_REJECTED", message);
  return candidates;
}

export function selectPaymentRequirement(
  requirements: PaymentRequirements[],
  policy: PaymentSelectionPolicy,
): PaymentRequirements {
  let candidates = requireCandidates(
    requirements.filter((requirement) => requirement.network.startsWith("hedera:")),
    "The resource did not offer a Hedera payment requirement.",
  );
  candidates = requireCandidates(
    candidates.filter((requirement) => requirement.scheme === "exact"),
    "The resource did not offer the exact payment scheme.",
  );
  candidates = requireCandidates(
    candidates.filter((requirement) => policy.allowedPaymentNetworks.includes(requirement.network)),
    "The resource payment network is not allowed by policy.",
  );
  candidates = requireCandidates(
    candidates.filter((requirement) => requirement.payTo === policy.expectedPayee),
    "The resource payment payee does not match the expected payee.",
  );
  candidates = requireCandidates(
    candidates.filter((requirement) => requirement.asset === policy.expectedAsset),
    "The resource payment asset does not match the expected asset.",
  );
  try {
    candidates = requireCandidates(
      candidates.filter((requirement) => BigInt(requirement.amount) <= BigInt(policy.maxPaymentAtomic)),
      "The resource payment exceeds the configured budget.",
    );
  } catch (error) {
    if (error instanceof BlockTermsError) throw error;
    throw new BlockTermsError("POLICY_REJECTED", "The resource offered an invalid atomic payment amount.");
  }
  return [...candidates].sort((left, right) => {
    const amountOrder = BigInt(left.amount) < BigInt(right.amount) ? -1 : BigInt(left.amount) > BigInt(right.amount) ? 1 : 0;
    return amountOrder || left.network.localeCompare(right.network);
  })[0] as PaymentRequirements;
}

export interface HederaX402AdapterOptions {
  accountId: string;
  privateKey: string;
  expectedPayee: string;
  expectedAsset: string;
  network: "hedera:testnet" | "hedera:mainnet";
  paidFetch?: typeof globalThis.fetch;
  fetch?: typeof globalThis.fetch;
  clock?: () => Date;
}

export class HederaX402Adapter implements PaymentAdapter {
  private readonly exactScheme?: ExactHederaScheme;
  private readonly clock: () => Date;

  constructor(private readonly options: HederaX402AdapterOptions) {
    this.clock = options.clock ?? (() => new Date());
    if (!options.paidFetch) {
      const privateKey = PrivateKey.fromString(options.privateKey);
      const signer = createClientHederaSigner(options.accountId, privateKey, { network: options.network });
      this.exactScheme = new ExactHederaScheme(signer);
    }
  }

  async pay(request: SubmitRequest["policy"], context: AdapterContext): Promise<PaymentReceipt> {
    if (!request.allowedPaymentNetworks.includes(this.options.network)) {
      throw new BlockTermsError("POLICY_REJECTED", "The configured Hedera network is not allowed by request policy.");
    }
    const timeoutSignal = AbortSignal.timeout(request.deadlineMs);
    const signal = AbortSignal.any([context.signal, timeoutSignal]);
    let selected: PaymentRequirements | undefined;
    const selectionPolicy: PaymentSelectionPolicy = {
      maxPaymentAtomic: request.maxPaymentAtomic,
      allowedPaymentNetworks: request.allowedPaymentNetworks,
      expectedPayee: this.options.expectedPayee,
      expectedAsset: this.options.expectedAsset,
    };
    const paidFetch = this.options.paidFetch ?? this.createPaidFetch(selectionPolicy, (requirement) => {
      selected = requirement;
    });
    try {
      const response = await paidFetch(request.resourceUrl, { method: "GET", signal });
      if (!response.ok) {
        throw new BlockTermsError("UPSTREAM_ERROR", `Paid resource returned HTTP ${response.status}.`, {
          retryable: response.status >= 500,
        });
      }
      const responseHeader = response.headers.get("payment-response") ?? response.headers.get("x-payment-response");
      if (!responseHeader) throw new BlockTermsError("UPSTREAM_ERROR", "Paid resource omitted the x402 settlement header.");
      let settlement;
      try {
        settlement = decodePaymentResponseHeader(responseHeader);
      } catch {
        throw new BlockTermsError("UPSTREAM_ERROR", "Paid resource returned an invalid x402 settlement header.");
      }
      if (!settlement.success || !settlement.transaction) {
        throw new BlockTermsError("UPSTREAM_ERROR", "x402 settlement was not successful.");
      }
      if (settlement.network !== this.options.network || !request.allowedPaymentNetworks.includes(settlement.network)) {
        throw new BlockTermsError("POLICY_REJECTED", "x402 settlement network does not match payment policy.");
      }
      const amountAtomic = settlement.amount ?? selected?.amount;
      if (!amountAtomic) throw new BlockTermsError("UPSTREAM_ERROR", "x402 settlement omitted the settled amount.");
      if (BigInt(amountAtomic) > BigInt(request.maxPaymentAtomic)) {
        throw new BlockTermsError("POLICY_REJECTED", "x402 settlement amount exceeds the configured budget.");
      }
      return PaymentReceiptSchema.parse({
        receiptId: settlement.transaction,
        transactionId: settlement.transaction,
        network: settlement.network,
        amountAtomic,
        asset: selected?.asset ?? this.options.expectedAsset,
        observedAt: this.clock().toISOString(),
      });
    } catch (error) {
      if (error instanceof BlockTermsError) throw error;
      if (timeoutSignal.aborted) {
        throw new BlockTermsError("UPSTREAM_ERROR", "Hedera x402 payment timed out.", { retryable: true });
      }
      if (context.signal.aborted) {
        throw new BlockTermsError("UPSTREAM_ERROR", "Hedera x402 payment was aborted.", { retryable: true });
      }
      throw new BlockTermsError("UPSTREAM_ERROR", "Hedera x402 payment failed.");
    }
  }

  private createPaidFetch(
    policy: PaymentSelectionPolicy,
    onSelected: (requirement: PaymentRequirements) => void,
  ): typeof globalThis.fetch {
    const exactScheme = this.exactScheme;
    if (!exactScheme) throw new BlockTermsError("INTERNAL_ERROR", "Hedera x402 scheme is unavailable.");
    const client = new x402Client((_version, requirements) => {
      const selected = selectPaymentRequirement(requirements, policy);
      onSelected(selected);
      return selected;
    }).register(this.options.network, exactScheme);
    return wrapFetchWithPayment(this.options.fetch ?? globalThis.fetch, client);
  }
}
