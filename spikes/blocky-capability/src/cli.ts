import { writeFile } from "node:fs/promises";
import { findHederaTestnetCapability } from "./supported";

const sourceUrl = "https://api.testnet.blocky402.com/supported";

function outputPath(args: string[]): string | undefined {
  const index = args.indexOf("--output");
  if (index === -1) return undefined;
  const path = args[index + 1];
  if (!path || path.startsWith("--")) throw new Error("--output requires an explicit file path.");
  return path;
}

async function main() {
  const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`Capability endpoint returned HTTP ${response.status}.`);
  const raw: unknown = await response.json();
  const capability = findHederaTestnetCapability(raw);

  console.log(`Source: ${sourceUrl}`);
  console.log(`Network: ${capability.network}`);
  console.log(`Scheme: ${capability.scheme}`);
  console.log(`x402 version: ${capability.x402Version}`);
  console.log(`Fee payer: ${capability.feePayer}`);
  console.log("No payment was created or settled.");

  const path = outputPath(process.argv.slice(2));
  if (path) {
    await writeFile(path, `${JSON.stringify({ sourceUrl, observedAt: new Date().toISOString(), capability }, null, 2)}\n`, {
      flag: "wx",
    });
    console.log(`Sanitized capability evidence written to ${path}.`);
  }
}

main().catch((error: unknown) => {
  console.error(`BLOCKED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 2;
});
