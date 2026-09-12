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

describe("BlockTerms MCP server", () => {
  it("lists seven tools and runs a complete simulation over stdio", async () => {
    const directory = await mkdtemp(join(tmpdir(), "blockterms-mcp-"));
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [executable],
      cwd: packageRoot,
      env: { ...getDefaultEnvironment(), BLOCKTERMS_STORE_PATH: join(directory, "orders.json") },
      stderr: "pipe",
    });
    const client = new Client({ name: "blockterms-test", version: "0.1.0" });
    await client.connect(transport);
    try {
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
        "get_capabilities", "get_order", "get_result", "get_status", "list_orders", "run_order", "submit_request",
      ]);

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
