import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { getDefaultEnvironment, StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { describe, expect, it } from "vitest";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const executable = join(packageRoot, "dist/index.js");
const request = {
  mode: "simulation",
  query: { kind: "standardized-pools", blockNumber: 16, poolLimit: 1 },
  witness: { network: "eip155:1", address: `0x${"11".repeat(20)}`, slots: ["0x0"], block: "0x10" },
  policy: {
    maxPaymentAtomic: "1000", allowedPaymentNetworks: ["hedera:testnet"],
    resourceUrl: "https://resource.example/data", deadlineMs: 5_000,
  },
};
const digest = `0x${"ab".repeat(32)}`;
const product = {
  provider: { id: "provider-atlas", type: "agent", displayName: "Atlas Agent" },
  manifest: {
    slug: "same-block-liquidity", name: "Same-block liquidity", summary: "Comparable live DEX liquidity with bounded proof coverage.", version: "1.0.0", kind: "snapshot", tags: ["defi"],
    schema: { family: "messari-dex-amm", version: "1.0.0" }, networks: ["eip155:1"], deployments: ["dex-a", "dex-b"], freshnessSeconds: 30, deliverySeconds: 20,
    commercial: { priceAtomic: "100", paymentNetwork: "hedera:testnet", asset: "HBAR", resourceUrl: "https://atlas.example/data", warrantyAtomic: "120", collateralCoverageBps: 12000 },
    verification: { profile: "graph-eip1186-v1", maxPools: 3, maxStorageSlots: 3 }, sample: { digest, uri: "ipfs://bafy-example" }, credentials: [],
  },
};

describe("BlockTerms MCP server", () => {
  it("lists order and marketplace tools and runs both surfaces over stdio", async () => {
    const directory = await mkdtemp(join(tmpdir(), "blockterms-mcp-"));
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [executable],
      cwd: packageRoot,
      env: { ...getDefaultEnvironment(), BLOCKTERMS_STORE_PATH: join(directory, "orders.json"), BLOCKTERMS_MARKETPLACE_STORE_PATH: join(directory, "marketplace.json") },
      stderr: "pipe",
    });
    const client = new Client({ name: "blockterms-test", version: "0.1.0" });
    await client.connect(transport);
    try {
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
        "create_data_bundle", "get_capabilities", "get_data_product", "get_data_provider", "get_order", "get_result", "get_status",
        "list_data_providers", "list_orders", "review_data_product", "run_order", "search_data_products", "submit_data_product", "submit_request",
      ]);

      const submittedProduct = await client.callTool({ name: "submit_data_product", arguments: { product } });
      const productId = (submittedProduct.structuredContent as { id: string }).id;
      await client.callTool({ name: "review_data_product", arguments: { productId, review: { decision: "approve", curatorId: "curator-blockterms", reason: "Sandbox passed.", sandbox: { passed: true, checkedAt: "2026-09-13T08:00:00.000Z", sampleDigest: digest } } } });
      const discovered = await client.callTool({ name: "search_data_products", arguments: { filter: { query: "atlas" } } });
      expect(discovered.structuredContent).toMatchObject({ products: [{ state: "active" }] });

      const submitted = await client.callTool({ name: "submit_request", arguments: { request } });
      expect(submitted.isError).not.toBe(true);
      const orderId = (submitted.structuredContent as { id: string }).id;
      const completed = await client.callTool({ name: "run_order", arguments: { orderId } });
      expect(completed.structuredContent).toMatchObject({ phase: "completed" });
      const result = await client.callTool({ name: "get_result", arguments: { orderId } });
      expect(result.structuredContent).toMatchObject({ mode: "simulation", decision: "accepted" });
    } finally {
      await client.close();
    }
  }, 20_000);
});
