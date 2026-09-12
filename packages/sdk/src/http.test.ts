import { describe, expect, it, vi } from "vitest";
import { createHttpClient } from "./http";

describe("HTTP transport", () => {
  it("maps client operations to stable REST endpoints", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => new Response(JSON.stringify({
      id: "00000000-0000-4000-8000-000000000001",
      phase: "queued",
    }), { status: 200, headers: { "content-type": "application/json" } }));
    const client = createHttpClient({ baseUrl: "https://api.example/", token: "private-token", fetch: fetchMock });

    await client.getOrder("00000000-0000-4000-8000-000000000001");

    expect(fetchMock).toHaveBeenCalledWith("https://api.example/v1/orders/00000000-0000-4000-8000-000000000001", expect.objectContaining({
      method: "GET",
      headers: expect.objectContaining({ authorization: "Bearer private-token" }),
    }));
  });

  it("decodes a safe domain error without exposing unrelated response fields", async () => {
    const client = createHttpClient({
      baseUrl: "https://api.example",
      fetch: async () => new Response(JSON.stringify({
        error: { code: "NOT_FOUND", message: "Order was not found.", retryable: false },
        debug: "upstream secret",
      }), { status: 404, headers: { "content-type": "application/json" } }),
    });

    await expect(client.getOrder("00000000-0000-4000-8000-000000000001")).rejects.toMatchObject({
      code: "NOT_FOUND", message: "Order was not found.", retryable: false,
    });
  });

  it("aborts requests at the configured timeout", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
    }));
    const client = createHttpClient({ baseUrl: "https://api.example", fetch: fetchMock, timeoutMs: 20 });

    await expect(client.health()).rejects.toThrow(/timed out/i);
  });
});
