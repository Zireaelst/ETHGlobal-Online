#!/usr/bin/env node
import { createLocalClient } from "@blockterms/sdk/local";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createBlockTermsMcpServer } from "./server";

const storePath = process.env.BLOCKTERMS_STORE_PATH ?? ".blockterms/orders.json";
serveStdio(() => createBlockTermsMcpServer(createLocalClient({ storePath })), {
  onerror: (error) => process.stderr.write(`BlockTerms MCP error: ${error.message}\n`),
});
