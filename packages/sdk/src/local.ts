import {
  BlockTermsService,
  JsonFileOrderRepository,
  inspectLiveConfiguration,
  readRuntimeConfig,
  type ExecutionAdapters,
} from "@blockterms/core";
import {
  createSimulationAdapters,
  EvmWitnessAdapter,
  GraphStandardizedAdapter,
  HederaX402Adapter,
} from "@blockterms/integrations";
import { BlockTermsClient } from "./client";

export interface LocalClientOptions {
  storePath: string;
  environment?: Record<string, string | undefined>;
}

export function createLocalClient(options: LocalClientOptions): BlockTermsClient {
  const config = readRuntimeConfig(options.environment ?? process.env);
  let live: ExecutionAdapters | undefined;
  if (inspectLiveConfiguration(config).liveReady) {
    live = {
      graph: new GraphStandardizedAdapter({
        deployments: [
          { endpoint: config.graphEndpointA as string, label: config.graphLabelA },
          { endpoint: config.graphEndpointB as string, label: config.graphLabelB },
        ],
        ...(config.graphAuthorization ? { authorization: config.graphAuthorization } : {}),
      }),
      witness: new EvmWitnessAdapter({ rpcUrl: config.sourceRpcUrl as string }),
      payment: new HederaX402Adapter({
        accountId: config.hederaAccountId as string,
        privateKey: config.hederaPrivateKey as string,
        expectedPayee: config.hederaExpectedPayee as string,
        expectedAsset: config.hederaExpectedAsset as string,
        network: config.hederaNetwork,
      }),
    };
  }
  const service = new BlockTermsService({
    repository: new JsonFileOrderRepository(options.storePath),
    adapters: { simulation: createSimulationAdapters(), ...(live ? { live } : {}) },
    config,
  });
  return new BlockTermsClient(service);
}
