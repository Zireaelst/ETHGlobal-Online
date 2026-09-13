import { timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { BlockTermsError, type SafeError } from "@blockterms/contracts";
import type { BlockTermsClient } from "@blockterms/sdk";

export interface ApiServerOptions {
  client: BlockTermsClient;
  token?: string;
  bodyLimitBytes?: number;
}

class HttpProblem extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function statusFor(error: BlockTermsError): number {
  return {
    VALIDATION_ERROR: 400,
    NOT_FOUND: 404,
    CONFLICT: 409,
    CONFIGURATION_REQUIRED: 424,
    POLICY_REJECTED: 403,
    UPSTREAM_ERROR: 502,
    INTERNAL_ERROR: 500,
  }[error.code];
}

function send(response: ServerResponse, status: number, value: unknown, headers: Record<string, string> = {}): void {
  const body = `${JSON.stringify(value)}\n`;
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(Buffer.byteLength(body)),
    "cache-control": "no-store",
    ...headers,
  });
  response.end(body);
}

function authorized(header: string | undefined, expected: string): boolean {
  const supplied = header?.startsWith("Bearer ") ? header.slice(7) : "";
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
}

async function readJson(request: IncomingMessage, limit: number): Promise<unknown> {
  if (!request.headers["content-type"]?.toLowerCase().startsWith("application/json")) {
    throw new HttpProblem(415, "Requests with a body must use application/json.");
  }
  const declaredLength = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > limit) throw new HttpProblem(413, "Request body is too large.");
  const chunks: Buffer[] = [];
  let size = 0;
  let oversized = false;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > limit) oversized = true;
    else chunks.push(buffer);
  }
  if (oversized) throw new HttpProblem(413, "Request body is too large.");
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpProblem(400, "Request body is not valid JSON.");
  }
}

function domainBody(error: BlockTermsError): { error: SafeError } {
  return { error: error.toSafeError() };
}

function marketplaceFilter(search: URLSearchParams): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  for (const key of ["query", "providerType", "schemaFamily", "network", "kind", "maxPriceAtomic", "credentialKind"] as const) {
    const value = search.get(key);
    if (value !== null) filter[key] = value;
  }
  for (const key of ["maxFreshnessSeconds", "minCollateralCoverageBps", "limit"] as const) {
    const value = search.get(key);
    if (value !== null) filter[key] = Number(value);
  }
  const includeInactive = search.get("includeInactive");
  if (includeInactive !== null) filter.includeInactive = includeInactive === "true";
  return filter;
}

export function createApiServer(options: ApiServerOptions): Server {
  const bodyLimit = options.bodyLimitBytes ?? 64 * 1024;
  return createServer(async (request, response) => {
    const requestId = randomUUID();
    response.setHeader("x-request-id", requestId);
    try {
      const method = request.method ?? "GET";
      const url = new URL(request.url ?? "/", "http://localhost");
      if (url.pathname.startsWith("/v1") && options.token && !authorized(request.headers.authorization, options.token)) {
        send(response, 401, domainBody(new BlockTermsError("POLICY_REJECTED", "A valid bearer token is required.")), {
          "www-authenticate": "Bearer",
        });
        return;
      }
      if (url.pathname === "/health") {
        if (method !== "GET") return send(response, 405, domainBody(new BlockTermsError("VALIDATION_ERROR", "Method not allowed.")), { allow: "GET" });
        return send(response, 200, await options.client.health());
      }
      if (url.pathname === "/v1/capabilities") {
        if (method !== "GET") return send(response, 405, domainBody(new BlockTermsError("VALIDATION_ERROR", "Method not allowed.")), { allow: "GET" });
        return send(response, 200, await options.client.capabilities());
      }
      if (url.pathname === "/v1/orders") {
        if (method === "POST") return send(response, 201, await options.client.submit(await readJson(request, bodyLimit) as never));
        if (method === "GET") {
          const limitValue = url.searchParams.get("limit");
          const limit = limitValue === null ? undefined : Number(limitValue);
          return send(response, 200, await options.client.listOrders(limit === undefined ? {} : { limit }));
        }
        return send(response, 405, domainBody(new BlockTermsError("VALIDATION_ERROR", "Method not allowed.")), { allow: "GET, POST" });
      }
      if (url.pathname === "/v1/marketplace/products") {
        if (method === "POST") return send(response, 201, await options.client.submitProduct(await readJson(request, bodyLimit) as never));
        if (method === "GET") return send(response, 200, await options.client.listProducts(marketplaceFilter(url.searchParams)));
        return send(response, 405, domainBody(new BlockTermsError("VALIDATION_ERROR", "Method not allowed.")), { allow: "GET, POST" });
      }
      if (url.pathname === "/v1/marketplace/bundles") {
        if (method === "POST") return send(response, 201, await options.client.createBundle(await readJson(request, bodyLimit) as never));
        return send(response, 405, domainBody(new BlockTermsError("VALIDATION_ERROR", "Method not allowed.")), { allow: "POST" });
      }
      if (url.pathname === "/v1/marketplace/providers") {
        if (method === "GET") return send(response, 200, await options.client.listProviders());
        return send(response, 405, domainBody(new BlockTermsError("VALIDATION_ERROR", "Method not allowed.")), { allow: "GET" });
      }
      if (url.pathname === "/v1/marketplace/outcomes") {
        if (method === "POST") return send(response, 200, await options.client.recordOutcome(await readJson(request, bodyLimit) as never));
        return send(response, 405, domainBody(new BlockTermsError("VALIDATION_ERROR", "Method not allowed.")), { allow: "POST" });
      }
      const marketplaceProduct = url.pathname.match(/^\/v1\/marketplace\/products\/([^/]+)(?:\/(review))?$/);
      if (marketplaceProduct) {
        const id = decodeURIComponent(marketplaceProduct[1] ?? "");
        if (marketplaceProduct[2] === "review" && method === "POST") return send(response, 200, await options.client.reviewProduct(id, await readJson(request, bodyLimit) as never));
        if (!marketplaceProduct[2] && method === "GET") return send(response, 200, await options.client.getProduct(id));
        return send(response, 405, domainBody(new BlockTermsError("VALIDATION_ERROR", "Method not allowed.")), { allow: marketplaceProduct[2] ? "POST" : "GET" });
      }
      const marketplaceProvider = url.pathname.match(/^\/v1\/marketplace\/providers\/([^/]+)$/);
      if (marketplaceProvider) {
        if (method === "GET") return send(response, 200, await options.client.getProvider(decodeURIComponent(marketplaceProvider[1] ?? "")));
        return send(response, 405, domainBody(new BlockTermsError("VALIDATION_ERROR", "Method not allowed.")), { allow: "GET" });
      }
      const match = url.pathname.match(/^\/v1\/orders\/([^/]+)(?:\/(run|status|result))?$/);
      if (match) {
        const id = decodeURIComponent(match[1] ?? "");
        const action = match[2];
        if (!action && method === "GET") return send(response, 200, await options.client.getOrder(id));
        if (action === "run" && method === "POST") return send(response, 200, await options.client.run(id));
        if (action === "status" && method === "GET") return send(response, 200, await options.client.getStatus(id));
        if (action === "result" && method === "GET") return send(response, 200, await options.client.getResult(id));
        const allow = action === "run" ? "POST" : "GET";
        return send(response, 405, domainBody(new BlockTermsError("VALIDATION_ERROR", "Method not allowed.")), { allow });
      }
      send(response, 404, domainBody(new BlockTermsError("NOT_FOUND", "Endpoint was not found.")));
    } catch (error) {
      if (error instanceof HttpProblem) {
        send(response, error.status, domainBody(new BlockTermsError("VALIDATION_ERROR", error.message)));
        return;
      }
      if (error instanceof BlockTermsError) {
        send(response, statusFor(error), domainBody(error));
        return;
      }
      send(response, 500, domainBody(new BlockTermsError("INTERNAL_ERROR", "Internal server error.")));
    }
  });
}
