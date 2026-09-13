#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { Command, CommanderError } from "commander";
import {
  BlockTermsError,
  type CreateBundleRequest,
  type OrderRecord,
  type ReviewProductRequest,
  type SubmitProductRequest,
  type SubmitRequest,
} from "@blockterms/contracts";
import { createHttpClient, type BlockTermsClient } from "@blockterms/sdk";
import { createLocalClient } from "@blockterms/sdk/local";
import { createApiServer } from "@blockterms/api";

interface GlobalOptions {
  apiUrl?: string;
  token?: string;
  store: string;
}

function writeJson(stream: NodeJS.WriteStream, value: unknown): void {
  stream.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function readRequestSource(path: string): Promise<string> {
  if (path !== "-") return readFile(path, "utf8");
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function readJsonFile(path: string, label: string): Promise<unknown> {
  try { return JSON.parse(await readRequestSource(path)); }
  catch { throw new BlockTermsError("VALIDATION_ERROR", `${label} file is not valid JSON.`); }
}

function client(options: GlobalOptions): BlockTermsClient {
  const apiUrl = options.apiUrl ?? process.env.BLOCKTERMS_API_URL;
  if (apiUrl) {
    const token = options.token ?? process.env.BLOCKTERMS_API_TOKEN;
    return createHttpClient({ baseUrl: apiUrl, ...(token ? { token } : {}) });
  }
  return createLocalClient({ storePath: options.store });
}

function recordExit(record: OrderRecord): void {
  if (record.phase === "configuration_required") process.exitCode = 3;
  if (record.phase === "failed") process.exitCode = 7;
}

function exampleRequest(mode: SubmitRequest["mode"]): SubmitRequest {
  return {
    mode,
    query: { kind: "standardized-pools", blockNumber: 16, poolLimit: 2 },
    witness: {
      network: "eip155:1",
      address: "0x1111111111111111111111111111111111111111",
      slots: ["0x0"],
      block: "0x10",
    },
    policy: {
      maxPaymentAtomic: "1000",
      allowedPaymentNetworks: ["hedera:testnet"],
      resourceUrl: "https://resource.example/data",
      deadlineMs: 30_000,
    },
  };
}

function exitCode(error: BlockTermsError): number {
  return {
    VALIDATION_ERROR: 2,
    CONFIGURATION_REQUIRED: 3,
    NOT_FOUND: 4,
    CONFLICT: 5,
    POLICY_REJECTED: 6,
    UPSTREAM_ERROR: 7,
    INTERNAL_ERROR: 1,
  }[error.code];
}

export async function runCli(argv: string[] = process.argv): Promise<void> {
  const program = new Command()
    .name("blockterms")
    .description("Agent-native BlockTerms data order client")
    .option("--api-url <url>", "use a remote BlockTerms API")
    .option("--token <token>", "bearer token for the remote API")
    .option("--store <path>", "local JSON order store", process.env.BLOCKTERMS_STORE_PATH ?? ".blockterms/orders.json")
    .showHelpAfterError()
    .exitOverride();

  program.command("submit")
    .requiredOption("--file <path>", "request JSON file, or - for stdin")
    .option("--run", "execute immediately after submission")
    .action(async (commandOptions: { file: string; run?: boolean }) => {
      let parsed: unknown;
      try {
        const source = await readRequestSource(commandOptions.file);
        parsed = JSON.parse(source);
      } catch {
        throw new BlockTermsError("VALIDATION_ERROR", "Request file is not valid JSON.");
      }
      const runtime = client(program.opts<GlobalOptions>());
      const submitted = await runtime.submit(parsed as SubmitRequest);
      const result = commandOptions.run ? await runtime.run(submitted.id) : submitted;
      writeJson(process.stdout, result);
      recordExit(result);
    });

  program.command("run <order-id>").action(async (orderId: string) => {
    const result = await client(program.opts<GlobalOptions>()).run(orderId);
    writeJson(process.stdout, result);
    recordExit(result);
  });
  program.command("get <order-id>").action(async (orderId: string) => {
    writeJson(process.stdout, await client(program.opts<GlobalOptions>()).getOrder(orderId));
  });
  program.command("status <order-id>").action(async (orderId: string) => {
    writeJson(process.stdout, await client(program.opts<GlobalOptions>()).getStatus(orderId));
  });
  program.command("result <order-id>").action(async (orderId: string) => {
    writeJson(process.stdout, await client(program.opts<GlobalOptions>()).getResult(orderId));
  });
  program.command("list").option("--limit <count>", "maximum records", "50").action(async (options: { limit: string }) => {
    writeJson(process.stdout, await client(program.opts<GlobalOptions>()).listOrders({ limit: Number(options.limit) }));
  });
  program.command("capabilities").action(async () => {
    writeJson(process.stdout, await client(program.opts<GlobalOptions>()).capabilities());
  });
  program.command("health").action(async () => {
    writeJson(process.stdout, await client(program.opts<GlobalOptions>()).health());
  });
  program.command("example").option("--mode <mode>", "auto, simulation, or live", "simulation").action((options: { mode: string }) => {
    if (!(["auto", "simulation", "live"] as string[]).includes(options.mode)) {
      throw new BlockTermsError("VALIDATION_ERROR", "Example mode must be auto, simulation, or live.");
    }
    writeJson(process.stdout, exampleRequest(options.mode as SubmitRequest["mode"]));
  });

  const market = program.command("market").description("Discover and manage verified data products");
  market.command("list")
    .option("--query <text>", "search product or provider text")
    .option("--provider-type <type>", "human, agent, or organization")
    .option("--network <caip2>", "required CAIP-2 network")
    .option("--kind <kind>", "snapshot, stream, report, or bundle")
    .option("--max-price <atomic>", "maximum atomic-unit price")
    .option("--include-inactive", "include non-active products")
    .option("--limit <count>", "maximum records", "50")
    .action(async (options: { query?: string; providerType?: string; network?: string; kind?: string; maxPrice?: string; includeInactive?: boolean; limit: string }) => {
      writeJson(process.stdout, await client(program.opts<GlobalOptions>()).listProducts({
        ...(options.query ? { query: options.query } : {}),
        ...(options.providerType ? { providerType: options.providerType as "human" | "agent" | "organization" } : {}),
        ...(options.network ? { network: options.network } : {}),
        ...(options.kind ? { kind: options.kind as "snapshot" | "stream" | "report" | "bundle" } : {}),
        ...(options.maxPrice ? { maxPriceAtomic: options.maxPrice } : {}),
        includeInactive: Boolean(options.includeInactive), limit: Number(options.limit),
      }));
    });
  market.command("get <id-or-slug>").action(async (idOrSlug: string) => {
    writeJson(process.stdout, await client(program.opts<GlobalOptions>()).getProduct(idOrSlug));
  });
  market.command("submit").requiredOption("--file <path>", "product JSON file, or - for stdin").action(async (options: { file: string }) => {
    writeJson(process.stdout, await client(program.opts<GlobalOptions>()).submitProduct(await readJsonFile(options.file, "Product") as SubmitProductRequest));
  });
  market.command("review <product-id>").requiredOption("--file <path>", "review JSON file, or - for stdin").action(async (productId: string, options: { file: string }) => {
    writeJson(process.stdout, await client(program.opts<GlobalOptions>()).reviewProduct(productId, await readJsonFile(options.file, "Review") as ReviewProductRequest));
  });
  market.command("bundle").requiredOption("--file <path>", "bundle JSON file, or - for stdin").action(async (options: { file: string }) => {
    writeJson(process.stdout, await client(program.opts<GlobalOptions>()).createBundle(await readJsonFile(options.file, "Bundle") as CreateBundleRequest));
  });

  const providers = program.command("providers").description("Inspect verified data providers");
  providers.command("list").action(async () => {
    writeJson(process.stdout, await client(program.opts<GlobalOptions>()).listProviders());
  });
  providers.command("get <provider-id>").action(async (providerId: string) => {
    writeJson(process.stdout, await client(program.opts<GlobalOptions>()).getProvider(providerId));
  });
  program.command("serve")
    .option("--host <host>", "listen host", process.env.BLOCKTERMS_API_HOST ?? "127.0.0.1")
    .option("--port <port>", "listen port", process.env.BLOCKTERMS_API_PORT ?? "8787")
    .action(async (options: { host: string; port: string }) => {
      const globalOptions = program.opts<GlobalOptions>();
      const marketplaceStorePath = process.env.BLOCKTERMS_MARKETPLACE_STORE_PATH;
      const runtime = createLocalClient({ storePath: globalOptions.store, ...(marketplaceStorePath ? { marketplaceStorePath } : {}) });
      const token = globalOptions.token ?? process.env.BLOCKTERMS_API_TOKEN;
      const server = createApiServer({ client: runtime, ...(token ? { token } : {}) });
      const port = Number(options.port);
      if (!Number.isInteger(port) || port < 0 || port > 65_535) throw new BlockTermsError("VALIDATION_ERROR", "Port is invalid.");
      await new Promise<void>((resolve, reject) => server.listen(port, options.host, () => resolve()).once("error", reject));
      process.stderr.write(`BlockTerms API listening on http://${options.host}:${port}\n`);
    });

  await program.parseAsync(argv);
}

runCli().catch((error: unknown) => {
  if (error instanceof CommanderError) {
    process.exitCode = error.exitCode;
    return;
  }
  const domainError = error instanceof BlockTermsError
    ? error
    : new BlockTermsError("INTERNAL_ERROR", "BlockTerms CLI failed.");
  writeJson(process.stderr, { error: domainError.toSafeError() });
  process.exitCode = exitCode(domainError);
});
