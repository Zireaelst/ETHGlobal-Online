import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { createLocalClient } from "../packages/sdk/dist/local.js";
import { createHttpClient } from "../packages/sdk/dist/index.js";
import { createApiServer } from "../services/api/dist/server.js";

const executeFile = promisify(execFile);
const workspace = resolve(import.meta.dirname, "..");
const directory = await mkdtemp(join(tmpdir(), "blockterms-market-e2e-"));
const storePath = join(directory, "orders.json");
const marketplaceStorePath = join(directory, "marketplace.json");
const productFixture = JSON.parse(await readFile(resolve(workspace, "examples/marketplace/product.json"), "utf8"));
const orderFixture = JSON.parse(await readFile(resolve(workspace, "examples/requests/simulation.json"), "utf8"));
const environment = { ...process.env, BLOCKTERMS_STORE_PATH: storePath, BLOCKTERMS_MARKETPLACE_STORE_PATH: marketplaceStorePath };
const checkedAt = "2026-09-13T08:00:00.000Z";

function reviewFor(sampleDigest) {
  return {
    decision: "approve",
    curatorId: "curator-e2e",
    reason: "End-to-end sandbox contract verified.",
    sandbox: { passed: true, checkedAt, sampleDigest },
  };
}

async function listen(client) {
  const server = createApiServer({ client });
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  assert(address && typeof address !== "string");
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function close(server) {
  await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
}

const local = createLocalClient({ storePath, marketplaceStorePath, environment: {} });
const firstDraft = await local.submitProduct(productFixture);
assert.equal(firstDraft.state, "draft");

const apiRuntime = createLocalClient({ storePath, marketplaceStorePath, environment: {} });
const api = await listen(apiRuntime);
const http = createHttpClient({ baseUrl: api.baseUrl });

try {
  const first = await http.reviewProduct(firstDraft.id, reviewFor(productFixture.manifest.sample.digest));
  assert.equal(first.state, "active");

  const secondFixture = structuredClone(productFixture);
  secondFixture.provider = { id: "provider-beacon", type: "organization", displayName: "Beacon Research" };
  secondFixture.manifest.slug = "same-block-risk-input";
  secondFixture.manifest.name = "Same-block risk input";
  secondFixture.manifest.summary = "A compatible standardized risk input for a composed treasury decision bundle.";
  secondFixture.manifest.commercial.resourceUrl = "https://resource.example/risk";
  secondFixture.manifest.sample.digest = `0x${"cd".repeat(32)}`;
  const secondPath = join(directory, "second-product.json");
  await writeFile(secondPath, JSON.stringify(secondFixture), "utf8");
  const cliSubmit = await executeFile(process.execPath, [resolve(workspace, "apps/cli/dist/index.js"), "market", "submit", "--file", secondPath], { cwd: workspace, env: environment });
  const secondDraft = JSON.parse(cliSubmit.stdout);
  assert.equal(secondDraft.state, "draft");
  const second = await local.reviewProduct(secondDraft.id, reviewFor(secondFixture.manifest.sample.digest));
  assert.equal(second.state, "active");

  const bundleDigest = `0x${"ef".repeat(32)}`;
  const bundle = await http.createBundle({
    provider: productFixture.provider,
    manifest: {
      ...productFixture.manifest,
      slug: "treasury-decision-bundle",
      name: "Treasury decision bundle",
      summary: "A version-pinned same-block composition of liquidity and risk products.",
      kind: "bundle",
      commercial: { ...productFixture.manifest.commercial, priceAtomic: "4300000", resourceUrl: "https://resource.example/bundle", warrantyAtomic: "4800000", collateralCoverageBps: 11200 },
      sample: { digest: bundleDigest, uri: "ipfs://bafy-example-marketplace-bundle" },
    },
    composition: { method: "same-block-union", components: [
      { productId: first.id, version: first.manifest.version, outputAlias: "liquidity" },
      { productId: second.id, version: second.manifest.version, outputAlias: "risk" },
    ] },
  });
  const activeBundle = await local.reviewProduct(bundle.id, reviewFor(bundleDigest));
  assert.equal(activeBundle.composition.components.length, 2);

  const clientModuleUrl = pathToFileURL(resolve(workspace, "apps/mcp/node_modules/@modelcontextprotocol/client/dist/index.mjs"));
  const stdioModuleUrl = pathToFileURL(resolve(workspace, "apps/mcp/node_modules/@modelcontextprotocol/client/dist/stdio.mjs"));
  const [{ Client }, { StdioClientTransport, getDefaultEnvironment }] = await Promise.all([import(clientModuleUrl.href), import(stdioModuleUrl.href)]);
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [resolve(workspace, "apps/mcp/dist/index.js")],
    cwd: workspace,
    env: { ...getDefaultEnvironment(), BLOCKTERMS_STORE_PATH: storePath, BLOCKTERMS_MARKETPLACE_STORE_PATH: marketplaceStorePath },
    stderr: "pipe",
  });
  const mcp = new Client({ name: "blockterms-market-e2e", version: "0.1.0" });
  await mcp.connect(transport);
  try {
    const discovery = await mcp.callTool({ name: "blockterms_list_products", arguments: { filter: { network: "eip155:1", maxPriceAtomic: "5000000" } } });
    assert.equal(discovery.structuredContent.products.length, 3);

    const purchaseRequest = structuredClone(orderFixture);
    purchaseRequest.policy.resourceUrl = first.manifest.commercial.resourceUrl;
    purchaseRequest.policy.maxPaymentAtomic = first.manifest.commercial.priceAtomic;
    purchaseRequest.marketplace = { productId: first.id, productVersion: first.manifest.version, providerId: first.provider.id };
    const order = await local.submit(purchaseRequest);
    const completed = await local.run(order.id);
    assert.equal(completed.phase, "completed");
    assert.deepEqual(completed.request.marketplace, purchaseRequest.marketplace);

    const profile = await http.recordOutcome({
      orderId: completed.id,
      productId: first.id,
      providerId: first.provider.id,
      mode: "simulation",
      outcome: "valid",
      warrantyPaid: false,
      paidAtomic: completed.result.payment.amountAtomic,
      latencyMs: 25,
    });
    assert.equal(profile.metrics.simulation.valid, 1);

    const providerResult = await mcp.callTool({ name: "get_data_provider", arguments: { providerId: first.provider.id } });
    assert.equal(providerResult.structuredContent.metrics.simulation.valid, 1);
  } finally {
    await mcp.close();
  }

  const cliGet = await executeFile(process.execPath, [resolve(workspace, "apps/cli/dist/index.js"), "products", "get", "treasury-decision-bundle"], { cwd: workspace, env: environment });
  assert.equal(JSON.parse(cliGet.stdout).id, activeBundle.id);

  process.stdout.write(`${JSON.stringify({
    ok: true,
    products: 3,
    bundleComponents: 2,
    purchaseMode: "simulation",
    interfaces: ["sdk", "http", "cli", "mcp"],
    credentialFree: true,
  })}\n`);
} finally {
  await close(api.server);
}
