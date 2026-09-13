import { describe, expect, it } from "vitest";
import { BlockTermsError } from "@blockterms/contracts";
import { inspectLiveConfiguration, readRuntimeConfig, resolveExecutionMode } from "./config";

const completeEnvironment = {
  GRAPH_ENDPOINT_A: "https://graph-a.example/graphql",
  GRAPH_ENDPOINT_B: "https://graph-b.example/graphql",
  SOURCE_RPC_URL: "https://rpc.example",
  HEDERA_ACCOUNT_ID: "0.0.1234",
  HEDERA_PRIVATE_KEY: "302e020100300506032b657004220420secret-value",
  HEDERA_EXPECTED_PAYEE: "0.0.4321",
  HEDERA_EXPECTED_ASSET: "0.0.456858",
};

describe("runtime configuration", () => {
  it("selects live only when every required setting is present", () => {
    const config = readRuntimeConfig(completeEnvironment);

    expect(resolveExecutionMode("auto", config)).toEqual({ selectedMode: "live", fallbackReasons: [] });
    expect(inspectLiveConfiguration(config)).toEqual({ liveReady: true, missing: [] });
  });

  it("rejects explicit live mode with only missing variable names", () => {
    const config = readRuntimeConfig({ GRAPH_ENDPOINT_A: completeEnvironment.GRAPH_ENDPOINT_A });

    expect(() => resolveExecutionMode("live", config)).toThrow(BlockTermsError);
    try {
      resolveExecutionMode("live", config);
    } catch (error) {
      expect((error as BlockTermsError).toSafeError()).toEqual({
        code: "CONFIGURATION_REQUIRED",
        message: "Live execution requires additional configuration.",
        missing: [
          "GRAPH_ENDPOINT_B",
          "SOURCE_RPC_URL",
          "HEDERA_ACCOUNT_ID",
          "HEDERA_PRIVATE_KEY",
          "HEDERA_EXPECTED_PAYEE",
          "HEDERA_EXPECTED_ASSET",
        ],
        retryable: false,
      });
      expect(JSON.stringify((error as BlockTermsError).toSafeError())).not.toContain("secret-value");
    }
  });

  it("selects simulation in auto mode and records why", () => {
    const selection = resolveExecutionMode("auto", readRuntimeConfig({}));

    expect(selection.selectedMode).toBe("simulation");
    expect(selection.fallbackReasons).toEqual([
      "missing:GRAPH_ENDPOINT_A",
      "missing:GRAPH_ENDPOINT_B",
      "missing:SOURCE_RPC_URL",
      "missing:HEDERA_ACCOUNT_ID",
      "missing:HEDERA_PRIVATE_KEY",
      "missing:HEDERA_EXPECTED_PAYEE",
      "missing:HEDERA_EXPECTED_ASSET",
    ]);
  });

  it("always honors an explicit simulation request", () => {
    expect(resolveExecutionMode("simulation", readRuntimeConfig(completeEnvironment))).toEqual({
      selectedMode: "simulation",
      fallbackReasons: [],
    });
  });

  it("keeps optional authorization available without exposing it in inspection", () => {
    const config = readRuntimeConfig({ ...completeEnvironment, GRAPH_AUTHORIZATION: "Bearer very-secret" });

    expect(config.graphAuthorization).toBe("Bearer very-secret");
    expect(JSON.stringify(inspectLiveConfiguration(config))).not.toContain("very-secret");
  });

  it("rejects malformed live endpoint and Hedera policy identifiers", () => {
    expect(() => readRuntimeConfig({ ...completeEnvironment, GRAPH_ENDPOINT_A: "not-a-url" }))
      .toThrow("GRAPH_ENDPOINT_A must be an HTTP(S) URL.");
    expect(() => readRuntimeConfig({ ...completeEnvironment, HEDERA_EXPECTED_PAYEE: "private-key-material" }))
      .toThrow("HEDERA_EXPECTED_PAYEE must be a Hedera account ID.");
    expect(() => readRuntimeConfig({ ...completeEnvironment, HEDERA_EXPECTED_ASSET: "HBAR" }))
      .toThrow("HEDERA_EXPECTED_ASSET must be a Hedera token ID.");
  });
});
