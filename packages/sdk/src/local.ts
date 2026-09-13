import {
  BlockTermsService,
  JsonFileOrderRepository,
  JsonFileMarketplaceRepository,
  MarketplaceService,
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
  marketplaceStorePath?: string;
  environment?: Record<string, string | undefined>;
}

export function createLocalClient(options: LocalClientOptions): BlockTermsClient {
  const config = readRuntimeConfig(options.environment ?? process.env);
  let live: (() => ExecutionAdapters) | undefined;
  if (inspectLiveConfiguration(config).liveReady) {
    live = () => ({
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
    });
  }
  const marketplace = new MarketplaceService({
    repository: new JsonFileMarketplaceRepository(options.marketplaceStorePath ?? `${options.storePath}.marketplace.json`),
  });
  const service = new BlockTermsService({
    repository: new JsonFileOrderRepository(options.storePath),
    adapters: { simulation: createSimulationAdapters(), ...(live ? { live } : {}) },
    config,
    marketplace,
  });
  return new BlockTermsClient({
    submit: (input) => service.submit(input),
    run: (id) => service.run(id),
    getOrder: (id) => service.getOrder(id),
    getStatus: (id) => service.getStatus(id),
    getResult: (id) => service.getResult(id),
    listOrders: (input) => service.listOrders(input),
    health: () => service.health(),
    capabilities: () => service.capabilities(),
    submitProduct: (input) => marketplace.submitProduct(input),
    reviewProduct: (id, input) => marketplace.reviewProduct(id, input),
    getProduct: (id) => marketplace.getProduct(id),
    listProducts: (input) => marketplace.listProducts(input),
    createBundle: (input) => marketplace.createBundle(input),
    listProviders: () => marketplace.listProviders(),
    getProvider: (id) => marketplace.getProvider(id),
    recordOutcome: (input) => marketplace.recordOutcome(input),
  });
}
