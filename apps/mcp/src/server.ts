import { BlockTermsError, SubmitRequestSchema } from "@blockterms/contracts";
import type { BlockTermsClient } from "@blockterms/sdk";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

const orderIdSchema = z.object({ orderId: z.string().uuid() });

function result(value: object) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
    structuredContent: value as Record<string, unknown>,
  };
}

async function execute(operation: () => Promise<object>) {
  try {
    return result(await operation());
  } catch (error) {
    const domainError = error instanceof BlockTermsError
      ? error
      : new BlockTermsError("INTERNAL_ERROR", "BlockTerms MCP operation failed.");
    const safe = domainError.toSafeError();
    return {
      isError: true,
      content: [{ type: "text" as const, text: `${safe.code}: ${safe.message}` }],
      structuredContent: { error: safe },
    };
  }
}

export function createBlockTermsMcpServer(client: BlockTermsClient): McpServer {
  const server = new McpServer({ name: "blockterms", version: "0.1.0" }, { capabilities: { tools: {} } });
  server.registerTool("submit_request", {
    title: "Submit BlockTerms request",
    description: "Validate and persist a new BlockTerms data order.",
    inputSchema: z.object({ request: SubmitRequestSchema }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, ({ request }) => execute(async () => await client.submit(request)));
  server.registerTool("run_order", {
    title: "Run BlockTerms order",
    description: "Execute a queued order using its selected live or simulation adapters.",
    inputSchema: orderIdSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, ({ orderId }) => execute(async () => await client.run(orderId)));
  server.registerTool("get_order", {
    title: "Get BlockTerms order",
    description: "Retrieve a complete persisted order record.",
    inputSchema: orderIdSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, ({ orderId }) => execute(async () => await client.getOrder(orderId)));
  server.registerTool("get_status", {
    title: "Get BlockTerms status",
    description: "Retrieve the current phase and safe error status for an order.",
    inputSchema: orderIdSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, ({ orderId }) => execute(async () => await client.getStatus(orderId)));
  server.registerTool("get_result", {
    title: "Get BlockTerms result",
    description: "Retrieve the completed normalized result for an order.",
    inputSchema: orderIdSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, ({ orderId }) => execute(async () => await client.getResult(orderId)));
  server.registerTool("list_orders", {
    title: "List BlockTerms orders",
    description: "List recent persisted order records.",
    inputSchema: z.object({ limit: z.number().int().min(1).max(100).default(50) }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, ({ limit }) => execute(async () => ({ orders: await client.listOrders({ limit }) })));
  server.registerTool("get_capabilities", {
    title: "Get BlockTerms capabilities",
    description: "Inspect runtime limits and credential readiness without exposing secret values.",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, () => execute(async () => await client.capabilities()));
  return server;
}
