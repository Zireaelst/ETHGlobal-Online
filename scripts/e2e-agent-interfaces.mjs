import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { createLocalClient } from "../packages/sdk/dist/local.js";
import { createHttpClient } from "../packages/sdk/dist/index.js";
import { createApiServer } from "../services/api/dist/server.js";

const executeFile = promisify(execFile);
const workspace = resolve(import.meta.dirname, "..");
const directory = await mkdtemp(join(tmpdir(), "blockterms-agent-e2e-"));
const storePath = join(directory, "orders.json");
const request = JSON.parse(await readFile(resolve(workspace, "examples/requests/simulation.json"), "utf8"));

const local = createLocalClient({ storePath, environment: {} });
const submitted = await local.submit(request);
const expected = await local.run(submitted.id);
assert.equal(expected.phase, "completed");

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

const firstApi = await listen(createLocalClient({ storePath, environment: {} }));
assert.deepEqual(await createHttpClient({ baseUrl: firstApi.baseUrl }).getOrder(submitted.id), expected);
await close(firstApi.server);

const restartedApi = await listen(createLocalClient({ storePath, environment: {} }));
assert.deepEqual(await createHttpClient({ baseUrl: restartedApi.baseUrl }).getResult(submitted.id), expected.result);
await close(restartedApi.server);

const cli = await executeFile(process.execPath, [resolve(workspace, "apps/cli/dist/index.js"), "get", submitted.id], {
  cwd: workspace,
  env: { ...process.env, BLOCKTERMS_STORE_PATH: storePath },
});
assert.deepEqual(JSON.parse(cli.stdout), expected);

const clientModuleUrl = pathToFileURL(resolve(workspace, "apps/mcp/node_modules/@modelcontextprotocol/client/dist/index.mjs"));
const stdioModuleUrl = pathToFileURL(resolve(workspace, "apps/mcp/node_modules/@modelcontextprotocol/client/dist/stdio.mjs"));
const [{ Client }, { StdioClientTransport, getDefaultEnvironment }] = await Promise.all([
  import(clientModuleUrl.href),
  import(stdioModuleUrl.href),
]);
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [resolve(workspace, "apps/mcp/dist/index.js")],
  cwd: workspace,
  env: { ...getDefaultEnvironment(), BLOCKTERMS_STORE_PATH: storePath },
  stderr: "pipe",
});
const mcp = new Client({ name: "blockterms-e2e", version: "0.1.0" });
await mcp.connect(transport);
try {
  const mcpResult = await mcp.callTool({ name: "get_result", arguments: { orderId: submitted.id } });
  assert.deepEqual(mcpResult.structuredContent, expected.result);
} finally {
  await mcp.close();
}

process.stdout.write(`${JSON.stringify({
  ok: true,
  orderId: submitted.id,
  phase: expected.phase,
  interfaces: ["sdk", "http", "cli", "mcp"],
  persistedAcrossApiRestart: true,
})}\n`);
