import { describe, expect, it } from "bun:test";
import { STRIPE_BALANCE_URL, validateStripeKey } from "../src/lib/stripe";

function makeFetch(status: number, ok: boolean) {
  return async (url: string, opts: { headers: Record<string, string> }) => {
    return {
      url,
      status,
      ok,
      headers: opts.headers,
    };
  };
}

describe("validateStripeKey", () => {
  it("returns ok=true when Stripe responds 200", async () => {
    const fetch = makeFetch(200, true);
    const result = await validateStripeKey(
      fetch as unknown as typeof globalThis.fetch,
      "rk_test_123"
    );
    expect(result).toEqual({ ok: true, error: null });
  });

  it("sends the Authorization header with the key", async () => {
    const captured = { url: "", headers: {} as Record<string, string> };
    const fetch = async (url: string, opts: { headers: Record<string, string> }) => {
      captured.url = url;
      captured.headers = opts.headers;
      return { status: 200, ok: true };
    };
    await validateStripeKey(fetch as unknown as typeof globalThis.fetch, "rk_test_secret");
    expect(captured.url).toBe(STRIPE_BALANCE_URL);
    expect(captured.headers.Authorization).toBe("Bearer rk_test_secret");
  });

  it("returns invalid_key on 401", async () => {
    const fetch = makeFetch(401, false);
    const result = await validateStripeKey(fetch as unknown as typeof globalThis.fetch, "bad_key");
    expect(result).toEqual({ ok: false, error: "invalid_key" });
  });

  it("returns a stripe_error for other non-ok statuses", async () => {
    const fetch = makeFetch(500, false);
    const result = await validateStripeKey(
      fetch as unknown as typeof globalThis.fetch,
      "rk_test_123"
    );
    expect(result).toEqual({ ok: false, error: "stripe_error_500" });
  });

  it("returns network_error when fetch throws", async () => {
    const fetch = async () => {
      throw new Error("net::ERR_INTERNET_DISCONNECTED");
    };
    const result = await validateStripeKey(
      fetch as unknown as typeof globalThis.fetch,
      "rk_test_123"
    );
    expect(result).toEqual({ ok: false, error: "network_error" });
  });

  it("returns missing_key for empty, undefined, or whitespace keys", async () => {
    const fetch = makeFetch(200, true);
    expect(await validateStripeKey(fetch as unknown as typeof globalThis.fetch, "")).toEqual({
      ok: false,
      error: "missing_key",
    });
    expect(await validateStripeKey(fetch as unknown as typeof globalThis.fetch, "   ")).toEqual({
      ok: false,
      error: "missing_key",
    });
    expect(
      await validateStripeKey(
        fetch as unknown as typeof globalThis.fetch,
        undefined as unknown as string
      )
    ).toEqual({
      ok: false,
      error: "missing_key",
    });
  });
});
