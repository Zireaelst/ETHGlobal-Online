import { resolve } from "node:path";
import { createLocalClient } from "../../packages/sdk/dist/local.js";

const client = createLocalClient({
  storePath: resolve(".blockterms/example-orders.json"),
  environment: {},
});
const request = {
  mode: "simulation",
  query: { kind: "standardized-pools", blockNumber: 16, poolLimit: 2 },
  witness: {
    network: "eip155:1",
    address: "0x1111111111111111111111111111111111111111",
    slots: ["0x0"],
    block: "0x10",
  },
  policy: {
    maxPaymentAtomic: "1000",
    allowedPaymentNetworks: ["hedera:testnet"],
    resourceUrl: "https://resource.example/data",
    deadlineMs: 30_000,
  },
};

const submitted = await client.submit(request);
console.log(JSON.stringify(await client.run(submitted.id), null, 2));
