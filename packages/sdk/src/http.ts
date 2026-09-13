import {
  BlockTermsError,
  SafeErrorSchema,
  type CreateBundleRequest,
  type ProductFilter,
  type RecordProductOutcomeRequest,
  type ReviewProductRequest,
  type SubmitProductRequest,
  type SubmitRequest,
} from "@blockterms/contracts";
import type { BlockTermsTransport, ListOrdersOptions } from "./client";
import { BlockTermsClient } from "./client";

export interface HttpClientOptions {
  baseUrl: string;
  token?: string;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
}

class HttpTransport implements BlockTermsTransport {
  private readonly baseUrl: string;
  private readonly fetchImplementation: typeof globalThis.fetch;
  private readonly timeoutMs: number;

  constructor(private readonly options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.fetchImplementation = options.fetch ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  submit(input: SubmitRequest) { return this.request("POST", "/v1/orders", input); }
  run(orderId: string) { return this.request("POST", `/v1/orders/${encodeURIComponent(orderId)}/run`); }
  getOrder(orderId: string) { return this.request("GET", `/v1/orders/${encodeURIComponent(orderId)}`); }
  getStatus(orderId: string) { return this.request("GET", `/v1/orders/${encodeURIComponent(orderId)}/status`); }
  getResult(orderId: string) { return this.request("GET", `/v1/orders/${encodeURIComponent(orderId)}/result`); }
  listOrders(options: ListOrdersOptions = {}) {
    const query = options.limit === undefined ? "" : `?limit=${encodeURIComponent(String(options.limit))}`;
    return this.request("GET", `/v1/orders${query}`);
  }
  submitProduct(input: SubmitProductRequest) { return this.request("POST", "/v1/marketplace/products", input); }
  reviewProduct(productId: string, input: ReviewProductRequest) { return this.request("POST", `/v1/marketplace/products/${encodeURIComponent(productId)}/review`, input); }
  getProduct(idOrSlug: string) { return this.request("GET", `/v1/marketplace/products/${encodeURIComponent(idOrSlug)}`); }
  listProducts(filter: ProductFilter = {}) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filter)) if (value !== undefined) query.set(key, String(value));
    return this.request("GET", `/v1/marketplace/products${query.size ? `?${query}` : ""}`);
  }
  createBundle(input: CreateBundleRequest) { return this.request("POST", "/v1/marketplace/bundles", input); }
  listProviders() { return this.request("GET", "/v1/marketplace/providers"); }
  getProvider(providerId: string) { return this.request("GET", `/v1/marketplace/providers/${encodeURIComponent(providerId)}`); }
  recordOutcome(input: RecordProductOutcomeRequest) { return this.request("POST", "/v1/marketplace/outcomes", input); }
  health() { return this.request("GET", "/health"); }
  capabilities() { return this.request("GET", "/v1/capabilities"); }

  private async request(method: string, path: string, body?: unknown): Promise<any> {
    const timeoutSignal = AbortSignal.timeout(this.timeoutMs);
    try {
      const response = await this.fetchImplementation(`${this.baseUrl}${path}`, {
        method,
        headers: {
          accept: "application/json",
          ...(body === undefined ? {} : { "content-type": "application/json" }),
          ...(this.options.token ? { authorization: `Bearer ${this.options.token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: timeoutSignal,
      });
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new BlockTermsError("UPSTREAM_ERROR", "BlockTerms API returned invalid JSON.", {
          retryable: response.status >= 500,
        });
      }
      if (!response.ok) {
        const safe = SafeErrorSchema.safeParse(
          payload && typeof payload === "object" ? (payload as { error?: unknown }).error : undefined,
        );
        if (safe.success) {
          throw new BlockTermsError(safe.data.code, safe.data.message, {
            retryable: safe.data.retryable,
            ...(safe.data.missing ? { missing: safe.data.missing } : {}),
          });
        }
        throw new BlockTermsError("UPSTREAM_ERROR", `BlockTerms API returned HTTP ${response.status}.`, {
          retryable: response.status >= 500,
        });
      }
      return payload;
    } catch (error) {
      if (error instanceof BlockTermsError) throw error;
      if (timeoutSignal.aborted) {
        throw new BlockTermsError("UPSTREAM_ERROR", "BlockTerms API request timed out.", { retryable: true });
      }
      throw new BlockTermsError("UPSTREAM_ERROR", "BlockTerms API request failed.", { retryable: true });
    }
  }
}

export function createHttpClient(options: HttpClientOptions): BlockTermsClient {
  return new BlockTermsClient(new HttpTransport(options));
}
