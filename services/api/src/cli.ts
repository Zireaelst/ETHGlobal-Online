#!/usr/bin/env node
import { createLocalClient } from "@blockterms/sdk/local";
import { createApiServer } from "./server";

const host = process.env.BLOCKTERMS_API_HOST ?? "127.0.0.1";
const port = Number(process.env.BLOCKTERMS_API_PORT ?? "8787");
const storePath = process.env.BLOCKTERMS_STORE_PATH ?? ".blockterms/orders.json";
const marketplaceStorePath = process.env.BLOCKTERMS_MARKETPLACE_STORE_PATH ?? ".blockterms/marketplace.json";
const client = createLocalClient({ storePath, marketplaceStorePath });
const server = createApiServer({ client, ...(process.env.BLOCKTERMS_API_TOKEN ? { token: process.env.BLOCKTERMS_API_TOKEN } : {}) });

server.listen(port, host, () => {
  process.stderr.write(`BlockTerms API listening on http://${host}:${port}\n`);
});

function shutdown(): void {
  server.close((error) => {
    if (error) process.stderr.write(`${error.message}\n`);
    process.exitCode = error ? 1 : 0;
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
