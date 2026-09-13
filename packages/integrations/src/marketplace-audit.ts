import { createHash } from "node:crypto";
import {
  BlockTermsError,
  CredentialAttestationSchema,
  type CredentialAccessGrant,
  type CredentialAttestation,
} from "@blockterms/contracts";
import { Client, PrivateKey, TopicMessageSubmitTransaction } from "@hiero-ledger/sdk";
import { z } from "zod";

const forbiddenKey = /authorization|private.?key|mnemonic|secret|api.?token|password/i;
const maxAuditBytes = 32 * 1024;

export interface MarketplaceAuditEvent {
  schema: "blockterms.marketplace.audit.v1";
  action: string;
  subject: { id: string; version: string };
  actorId: string;
  occurredAt: string;
  payload: unknown;
}

export interface MarketplaceAuditReceipt {
  network: "hedera:testnet" | "hedera:mainnet";
  topicId: string;
  reference: string;
  sequenceNumber?: string;
  digest: string;
}

export type IntegrationStatus =
  | { enabled: true; integration: string; network?: string; reference?: string }
  | { enabled: false; integration: string; missing: string[] };

export interface MarketplaceAuditAnchor {
  status(): IntegrationStatus;
  anchor(event: MarketplaceAuditEvent): Promise<MarketplaceAuditReceipt>;
}

export interface CredentialVerification {
  valid: boolean;
  verificationId: string;
  verifiedAt: string;
  reason?: string;
}

export interface MarketplaceCredentialVerifier {
  status(): IntegrationStatus;
  verify(attestation: CredentialAttestation): Promise<CredentialVerification>;
  validate(grant: CredentialAccessGrant): Promise<boolean>;
}

function canonicalize(value: unknown, seen = new Set<object>()): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new BlockTermsError("POLICY_REJECTED", "Audit data must contain finite JSON numbers.");
    return JSON.stringify(value);
  }
  if (typeof value !== "object") throw new BlockTermsError("POLICY_REJECTED", "Audit data must contain JSON values only.");
  if (seen.has(value)) throw new BlockTermsError("POLICY_REJECTED", "Audit data must not contain cycles.");
  seen.add(value);
  try {
    if (Array.isArray(value)) return `[${value.map((entry) => canonicalize(entry, seen)).join(",")}]`;
    const record = value as Record<string, unknown>;
    const fields = Object.keys(record).sort().map((key) => {
      if (forbiddenKey.test(key)) throw new BlockTermsError("POLICY_REJECTED", "Audit data contains a secret-bearing key.");
      return `${JSON.stringify(key)}:${canonicalize(record[key], seen)}`;
    });
    return `{${fields.join(",")}}`;
  } finally {
    seen.delete(value);
  }
}

export function canonicalMarketplaceDigest(value: unknown): string {
  const canonical = canonicalize(value);
  if (Buffer.byteLength(canonical, "utf8") > maxAuditBytes) {
    throw new BlockTermsError("POLICY_REJECTED", "Marketplace audit data must not exceed 32 KiB.");
  }
  return `0x${createHash("sha256").update(canonical).digest("hex")}`;
}

interface HcsSubmissionResult { transactionId: string; sequenceNumber?: string }

export interface HederaHcsMarketplaceAuditAnchorOptions {
  network: "hedera:testnet" | "hedera:mainnet";
  topicId: string;
  accountId?: string;
  privateKey?: string;
  submitMessage?: (message: string) => Promise<HcsSubmissionResult>;
}

export class HederaHcsMarketplaceAuditAnchor implements MarketplaceAuditAnchor {
  constructor(private readonly options: HederaHcsMarketplaceAuditAnchorOptions) {}

  status(): IntegrationStatus {
    return { enabled: true, integration: "hedera-hcs", network: this.options.network, reference: this.options.topicId };
  }

  async anchor(event: MarketplaceAuditEvent): Promise<MarketplaceAuditReceipt> {
    const digest = canonicalMarketplaceDigest(event);
    const message = JSON.stringify({
      schema: "blockterms.marketplace.anchor.v1",
      action: event.action,
      subject: event.subject,
      actorId: event.actorId,
      occurredAt: event.occurredAt,
      digest,
    });
    const submitted = await (this.options.submitMessage ?? ((body) => this.submitToHcs(body)))(message);
    return {
      network: this.options.network,
      topicId: this.options.topicId,
      reference: submitted.transactionId,
      ...(submitted.sequenceNumber ? { sequenceNumber: submitted.sequenceNumber } : {}),
      digest,
    };
  }

  private async submitToHcs(message: string): Promise<HcsSubmissionResult> {
    if (!this.options.accountId || !this.options.privateKey) {
      throw new BlockTermsError("CONFIGURATION_REQUIRED", "Hedera HCS audit anchoring requires an operator account and private key.", {
        missing: ["HEDERA_ACCOUNT_ID", "HEDERA_PRIVATE_KEY"],
      });
    }
    const client = this.options.network === "hedera:mainnet" ? Client.forMainnet() : Client.forTestnet();
    client.setOperator(this.options.accountId, PrivateKey.fromString(this.options.privateKey));
    try {
      const response = await new TopicMessageSubmitTransaction()
        .setTopicId(this.options.topicId)
        .setMessage(message)
        .execute(client);
      const receipt = await response.getReceipt(client);
      return {
        transactionId: response.transactionId.toString(),
        ...(receipt.topicSequenceNumber ? { sequenceNumber: receipt.topicSequenceNumber.toString() } : {}),
      };
    } catch {
      throw new BlockTermsError("UPSTREAM_ERROR", "Hedera HCS audit anchoring failed.");
    } finally {
      client.close();
    }
  }
}

class DisabledMarketplaceAuditAnchor implements MarketplaceAuditAnchor {
  constructor(private readonly missing: string[]) {}
  status(): IntegrationStatus { return { enabled: false, integration: "hedera-hcs", missing: this.missing }; }
  async anchor(): Promise<MarketplaceAuditReceipt> {
    throw new BlockTermsError("CONFIGURATION_REQUIRED", "Hedera HCS audit anchoring is not configured.", { missing: this.missing });
  }
}

export function createMarketplaceAuditAnchorFromEnvironment(environment: Record<string, string | undefined>): MarketplaceAuditAnchor {
  const required = ["HCS_TOPIC_ID", "HEDERA_ACCOUNT_ID", "HEDERA_PRIVATE_KEY"] as const;
  const missing = required.filter((name) => !environment[name]);
  if (missing.length > 0) return new DisabledMarketplaceAuditAnchor([...missing]);
  return new HederaHcsMarketplaceAuditAnchor({
    network: environment.HEDERA_NETWORK === "hedera:mainnet" ? "hedera:mainnet" : "hedera:testnet",
    topicId: environment.HCS_TOPIC_ID as string,
    accountId: environment.HEDERA_ACCOUNT_ID as string,
    privateKey: environment.HEDERA_PRIVATE_KEY as string,
  });
}

const VerificationResponseSchema = z.object({
  valid: z.boolean(),
  verificationId: z.string().min(1).max(200),
  reason: z.string().max(500).optional(),
}).strict();

export interface HttpMarketplaceCredentialVerifierOptions {
  endpoint: string;
  apiToken?: string;
  fetch?: typeof globalThis.fetch;
  clock?: () => Date;
}

export class HttpMarketplaceCredentialVerifier implements MarketplaceCredentialVerifier {
  private readonly fetch: typeof globalThis.fetch;
  private readonly clock: () => Date;

  constructor(private readonly options: HttpMarketplaceCredentialVerifierOptions) {
    this.fetch = options.fetch ?? globalThis.fetch;
    this.clock = options.clock ?? (() => new Date());
  }

  status(): IntegrationStatus { return { enabled: true, integration: "credential-http", reference: this.options.endpoint }; }

  async verify(input: CredentialAttestation): Promise<CredentialVerification> {
    const attestation = CredentialAttestationSchema.parse(input);
    const parsed = await this.request("blockterms.marketplace.credential-check.v1", { attestation });
    return {
      valid: parsed.valid,
      verificationId: parsed.verificationId,
      verifiedAt: this.clock().toISOString(),
      ...(parsed.reason ? { reason: parsed.reason } : {}),
    };
  }

  async validate(grant: CredentialAccessGrant): Promise<boolean> {
    const parsed = await this.request("blockterms.marketplace.grant-check.v1", { grant });
    return parsed.valid && parsed.verificationId === grant.verificationId;
  }

  private async request(schema: string, payload: object): Promise<z.infer<typeof VerificationResponseSchema>> {
    let response: Response;
    try {
      response = await this.fetch(this.options.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(this.options.apiToken ? { authorization: `Bearer ${this.options.apiToken}` } : {}),
        },
        body: JSON.stringify({ schema, ...payload }),
      });
    } catch {
      throw new BlockTermsError("UPSTREAM_ERROR", "Credential verifier request failed.");
    }
    if (!response.ok) throw new BlockTermsError("UPSTREAM_ERROR", `Credential verifier returned HTTP ${response.status}.`, { retryable: response.status >= 500 });
    let parsed: z.infer<typeof VerificationResponseSchema>;
    try {
      parsed = VerificationResponseSchema.parse(await response.json());
    } catch {
      throw new BlockTermsError("UPSTREAM_ERROR", "Credential verifier returned an invalid response.");
    }
    return parsed;
  }
}
