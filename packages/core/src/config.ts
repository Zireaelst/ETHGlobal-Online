import { BlockTermsError, type SubmitRequest } from "@blockterms/contracts";

const requiredLiveVariables = [
  "GRAPH_ENDPOINT_A",
  "GRAPH_ENDPOINT_B",
  "SOURCE_RPC_URL",
  "HEDERA_ACCOUNT_ID",
  "HEDERA_PRIVATE_KEY",
  "HEDERA_EXPECTED_PAYEE",
  "HEDERA_EXPECTED_ASSET",
] as const;

export type RequiredLiveVariable = (typeof requiredLiveVariables)[number];

export interface RuntimeConfig {
  graphEndpointA?: string;
  graphEndpointB?: string;
  graphLabelA: string;
  graphLabelB: string;
  graphAuthorization?: string;
  sourceRpcUrl?: string;
  hederaAccountId?: string;
  hederaPrivateKey?: string;
  hederaExpectedPayee?: string;
  hederaExpectedAsset?: string;
  hederaNetwork: "hedera:testnet" | "hedera:mainnet";
  blockySupportedUrl: string;
}

export interface LiveConfigurationInspection {
  liveReady: boolean;
  missing: RequiredLiveVariable[];
}

export interface ExecutionModeSelection {
  selectedMode: "simulation" | "live";
  fallbackReasons: string[];
}

function value(environment: Record<string, string | undefined>, name: string): string | undefined {
  const candidate = environment[name]?.trim();
  return candidate ? candidate : undefined;
}

function assertHttpUrl(candidate: string | undefined, name: string): void {
  if (!candidate) return;
  try {
    const url = new URL(candidate);
    if (url.protocol === "http:" || url.protocol === "https:") return;
  } catch {
    // Report only the field name so a credential accidentally pasted here is never reflected.
  }
  throw new BlockTermsError("VALIDATION_ERROR", `${name} must be an HTTP(S) URL.`);
}

function assertHederaId(candidate: string | undefined, name: string, kind: "account" | "token" = "account"): void {
  if (candidate && !/^\d+\.\d+\.\d+$/.test(candidate)) {
    throw new BlockTermsError("VALIDATION_ERROR", `${name} must be a Hedera ${kind} ID.`);
  }
}

export function readRuntimeConfig(environment: Record<string, string | undefined> = process.env): RuntimeConfig {
  const graphEndpointA = value(environment, "GRAPH_ENDPOINT_A");
  const graphEndpointB = value(environment, "GRAPH_ENDPOINT_B");
  const graphAuthorization = value(environment, "GRAPH_AUTHORIZATION");
  const sourceRpcUrl = value(environment, "SOURCE_RPC_URL");
  const hederaAccountId = value(environment, "HEDERA_ACCOUNT_ID");
  const hederaPrivateKey = value(environment, "HEDERA_PRIVATE_KEY");
  const hederaExpectedPayee = value(environment, "HEDERA_EXPECTED_PAYEE");
  const hederaExpectedAsset = value(environment, "HEDERA_EXPECTED_ASSET");
  const configuredNetwork = value(environment, "HEDERA_NETWORK");
  if (configuredNetwork && configuredNetwork !== "hedera:testnet" && configuredNetwork !== "hedera:mainnet") {
    throw new BlockTermsError("VALIDATION_ERROR", "HEDERA_NETWORK must be hedera:testnet or hedera:mainnet.");
  }
  assertHttpUrl(graphEndpointA, "GRAPH_ENDPOINT_A");
  assertHttpUrl(graphEndpointB, "GRAPH_ENDPOINT_B");
  assertHttpUrl(sourceRpcUrl, "SOURCE_RPC_URL");
  assertHederaId(hederaAccountId, "HEDERA_ACCOUNT_ID");
  assertHederaId(hederaExpectedPayee, "HEDERA_EXPECTED_PAYEE");
  assertHederaId(hederaExpectedAsset, "HEDERA_EXPECTED_ASSET", "token");
  const hederaNetwork: "hedera:testnet" | "hedera:mainnet" = configuredNetwork === "hedera:mainnet"
    ? "hedera:mainnet"
    : "hedera:testnet";
  return {
    graphLabelA: value(environment, "GRAPH_LABEL_A") ?? "deployment-a",
    graphLabelB: value(environment, "GRAPH_LABEL_B") ?? "deployment-b",
    blockySupportedUrl: value(environment, "BLOCKY_SUPPORTED_URL") ?? "https://api.testnet.blocky402.com/supported",
    hederaNetwork,
    ...(graphEndpointA ? { graphEndpointA } : {}),
    ...(graphEndpointB ? { graphEndpointB } : {}),
    ...(graphAuthorization ? { graphAuthorization } : {}),
    ...(sourceRpcUrl ? { sourceRpcUrl } : {}),
    ...(hederaAccountId ? { hederaAccountId } : {}),
    ...(hederaPrivateKey ? { hederaPrivateKey } : {}),
    ...(hederaExpectedPayee ? { hederaExpectedPayee } : {}),
    ...(hederaExpectedAsset ? { hederaExpectedAsset } : {}),
  };
}

export function inspectLiveConfiguration(config: RuntimeConfig): LiveConfigurationInspection {
  const configured: Record<RequiredLiveVariable, string | undefined> = {
    GRAPH_ENDPOINT_A: config.graphEndpointA,
    GRAPH_ENDPOINT_B: config.graphEndpointB,
    SOURCE_RPC_URL: config.sourceRpcUrl,
    HEDERA_ACCOUNT_ID: config.hederaAccountId,
    HEDERA_PRIVATE_KEY: config.hederaPrivateKey,
    HEDERA_EXPECTED_PAYEE: config.hederaExpectedPayee,
    HEDERA_EXPECTED_ASSET: config.hederaExpectedAsset,
  };
  const missing = requiredLiveVariables.filter((name) => !configured[name]);
  return { liveReady: missing.length === 0, missing };
}

export function resolveExecutionMode(
  requested: SubmitRequest["mode"],
  config: RuntimeConfig,
): ExecutionModeSelection {
  if (requested === "simulation") return { selectedMode: "simulation", fallbackReasons: [] };
  const inspection = inspectLiveConfiguration(config);
  if (inspection.liveReady) return { selectedMode: "live", fallbackReasons: [] };
  if (requested === "live") {
    throw new BlockTermsError("CONFIGURATION_REQUIRED", "Live execution requires additional configuration.", {
      missing: inspection.missing,
    });
  }
  return {
    selectedMode: "simulation",
    fallbackReasons: inspection.missing.map((name) => `missing:${name}`),
  };
}
