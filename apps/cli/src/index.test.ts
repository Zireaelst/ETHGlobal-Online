import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { describe, expect, it } from "vitest";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const executable = join(packageRoot, "dist/index.js");
const fixture = join(packageRoot, "test/fixtures/request.json");

async function run(args: string[], storePath: string) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [executable, ...args], {
      cwd: packageRoot,
      env: { ...process.env, BLOCKTERMS_STORE_PATH: storePath },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function temporaryStore() {
  return join(await mkdtemp(join(tmpdir(), "blockterms-cli-")), "orders.json");
}

describe("blockterms CLI", () => {
  it("prints a valid example request as clean JSON", async () => {
    const result = await run(["example", "--mode", "simulation"], await temporaryStore());

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toMatchObject({ mode: "simulation", query: { kind: "standardized-pools" } });
  });

  it("submits and runs a request in one command", async () => {
    const result = await run(["submit", "--file", fixture, "--run"], await temporaryStore());

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toMatchObject({ phase: "completed", result: { mode: "simulation" } });
  });

  it("retrieves status and result across processes", async () => {
    const store = await temporaryStore();
    const submitted = JSON.parse((await run(["submit", "--file", fixture], store)).stdout) as { id: string };
    expect((await run(["run", submitted.id], store)).code).toBe(0);

    expect(JSON.parse((await run(["status", submitted.id], store)).stdout)).toMatchObject({ phase: "completed" });
    expect(JSON.parse((await run(["result", submitted.id], store)).stdout)).toMatchObject({ mode: "simulation" });
  });

  it("uses stable exits for invalid JSON and missing orders", async () => {
    const directory = await mkdtemp(join(tmpdir(), "blockterms-cli-invalid-"));
    const invalid = join(directory, "invalid.json");
    await writeFile(invalid, "{bad", "utf8");

    const malformed = await run(["submit", "--file", invalid], join(directory, "orders.json"));
    const missing = await run(["get", "00000000-0000-4000-8000-000000000099"], join(directory, "orders.json"));
    expect(malformed.code).toBe(2);
    expect(JSON.parse(malformed.stderr)).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    expect(missing.code).toBe(4);
    expect(JSON.parse(missing.stderr)).toMatchObject({ error: { code: "NOT_FOUND" } });
  });
});
