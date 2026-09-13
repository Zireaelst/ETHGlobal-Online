import { describe, expect, it, vi } from "vitest";
import {
  HederaHcsMarketplaceAuditAnchor,
  HttpMarketplaceCredentialVerifier,
  canonicalMarketplaceDigest,
  createMarketplaceAuditAnchorFromEnvironment,
  type MarketplaceAuditEvent,
} from "./marketplace-audit";

const event: MarketplaceAuditEvent = {
  schema: "blockterms.marketplace.audit.v1",
  action: "product.approved",
  subject: { id: "00000000-0000-4000-8000-000000000101", version: "1.0.0" },
  actorId: "curator-one",
  occurredAt: "2026-09-13T08:00:00.000Z",
  payload: { sampleDigest: `0x${"ab".repeat(32)}`, state: "active" },
};

describe("marketplace audit integrations", () => {
  it("creates a canonical digest independent of object key order", () => {
    const reordered = { ...event, payload: { state: "active", sampleDigest: `0x${"ab".repeat(32)}` } };
    expect(canonicalMarketplaceDigest(event)).toBe(canonicalMarketplaceDigest(reordered));
    expect(canonicalMarketplaceDigest(event)).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("rejects secret-bearing audit fields before hashing or submission", async () => {
    expect(() => canonicalMarketplaceDigest({ ...event, payload: { privateKey: "must-never-anchor" } })).toThrow(/secret-bearing/i);
    const submitMessage = vi.fn(async (_message: string) => ({ transactionId: "0.0.100@1.000000001", sequenceNumber: "7" }));
    const anchor = new HederaHcsMarketplaceAuditAnchor({
      network: "hedera:testnet", topicId: "0.0.700", submitMessage,
    });
    await expect(anchor.anchor({ ...event, payload: { apiToken: "must-never-anchor" } })).rejects.toThrow(/secret-bearing/i);
    expect(submitMessage).not.toHaveBeenCalled();
  });

  it("reports disabled network status without credentials", async () => {
    const anchor = createMarketplaceAuditAnchorFromEnvironment({});
    expect(anchor.status()).toEqual({
      enabled: false,
      integration: "hedera-hcs",
      missing: ["HCS_TOPIC_ID", "HEDERA_ACCOUNT_ID", "HEDERA_PRIVATE_KEY"],
    });
    await expect(anchor.anchor(event)).rejects.toMatchObject({ code: "CONFIGURATION_REQUIRED" });
  });

  it("submits only a compact digest envelope to HCS", async () => {
    const submitMessage = vi.fn(async (_message: string) => ({ transactionId: "0.0.100@1.000000001", sequenceNumber: "7" }));
    const anchor = new HederaHcsMarketplaceAuditAnchor({
      network: "hedera:testnet", topicId: "0.0.700", submitMessage,
    });
    const receipt = await anchor.anchor(event);
    expect(receipt).toEqual({
      network: "hedera:testnet", reference: "0.0.100@1.000000001", sequenceNumber: "7",
      digest: canonicalMarketplaceDigest(event), topicId: "0.0.700",
    });
    const envelope = JSON.parse(submitMessage.mock.calls[0]?.[0] ?? "null");
    expect(envelope).toMatchObject({ schema: "blockterms.marketplace.anchor.v1", action: event.action, digest: receipt.digest });
    expect(envelope).not.toHaveProperty("payload");
  });

  it("verifies credential references through a configured HTTP adapter", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ valid: true, verificationId: "verify-17" }), {
      status: 200, headers: { "content-type": "application/json" },
    }));
    const verifier = new HttpMarketplaceCredentialVerifier({
      endpoint: "https://verifier.example/check", apiToken: "held-inside-adapter", fetch,
      clock: () => new Date("2026-09-13T08:00:00.000Z"),
    });
    await expect(verifier.verify({
      kind: "zk-tls", issuer: "Example verifier", subject: "source access",
      issuedAt: "2026-09-13T07:00:00.000Z", expiresAt: "2026-10-13T08:00:00.000Z",
      reference: "https://credential.example/17",
    })).resolves.toEqual({ valid: true, verificationId: "verify-17", verifiedAt: "2026-09-13T08:00:00.000Z" });
    expect(fetch).toHaveBeenCalledWith("https://verifier.example/check", expect.objectContaining({
      method: "POST", headers: expect.objectContaining({ authorization: "Bearer held-inside-adapter" }),
    }));
  });
});
