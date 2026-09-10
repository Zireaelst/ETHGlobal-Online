import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";

const roots = ["apps/web/src", "packages/protocol/src", "packages/ui/src", "demo/evidence", "deployment"];
const forbidden = [
  /0x(?:0{64}|[fF]{64}|[aA]{64}|(?:deadbeef){8})/g,
  /0\.0\.(?:0|1234|12345|9999)\b/g,
  /\b(?:TX_HASH|TRANSACTION_HASH|CONTRACT_ADDRESS|EXPLORER_URL)\b/g,
];
const allowedFiles = new Set(["demo/evidence/README.md"]);

async function filesUnder(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? filesUnder(path) : [path];
    }));
    return nested.flat();
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

const files = (await Promise.all(roots.map(filesUnder))).flat();
const violations = [];
for (const file of files) {
  if (allowedFiles.has(file) || ![".ts", ".tsx", ".json", ".md"].includes(extname(file))) continue;
  const source = await readFile(file, "utf8");
  for (const pattern of forbidden) {
    for (const match of source.matchAll(pattern)) violations.push(`${file}: ${match[0]}`);
  }
}
if (violations.length) {
  console.error(violations.join("\n"));
  process.exit(1);
}
console.log("No transaction-like placeholder evidence found.");
