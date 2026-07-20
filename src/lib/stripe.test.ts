import { describe, expect, it } from "bun:test"
import { ignoredSubscriptions, steadySubscriptions } from "../../tests/fixtures/stripe-responses"
import { fetchStripeMetrics, STRIPE_SUBSCRIPTIONS_URL } from "./stripe"

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", ...headers },
    status,
  })
}

describe("fetchStripeMetrics", () => {
  it("normalizes monthly and annual licensed subscriptions into MRR", async () => {
    const fetchImpl = async () => jsonResponse(steadySubscriptions)
    const result = await fetchStripeMetrics(fetchImpl, "rk_test_123")
    expect(result).toEqual({ ok: true, value: { currency: "usd", mrr: 300 } })
  })

  it("excludes trials, unpaid subscriptions, and metered prices", async () => {
    const fetchImpl = async () => jsonResponse(ignoredSubscriptions)
    const result = await fetchStripeMetrics(fetchImpl, "rk_test_123")
    expect(result).toEqual({ ok: true, value: { currency: "usd", mrr: 0 } })
  })

  it("paginates and sends the credential only in the authorization header", async () => {
    const requests: Array<{ authorization: string | null; url: string }> = []
    const fetchImpl = async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = String(input)
      requests.push({
        authorization: new Headers(init?.headers).get("authorization"),
        url,
      })
      if (requests.length === 1) {
        return jsonResponse({ data: [steadySubscriptions.data[0]], has_more: true })
      }
      return jsonResponse({ data: [steadySubscriptions.data[1]], has_more: false })
    }
    const result = await fetchStripeMetrics(fetchImpl, "rk_test_secret")
    expect(result.ok).toBe(true)
    expect(requests[0].url.startsWith(STRIPE_SUBSCRIPTIONS_URL)).toBe(true)
    expect(requests[1].url).toContain("starting_after=sub_monthly")
    expect(requests.map((request) => request.authorization)).toEqual([
      "Bearer rk_test_secret",
      "Bearer rk_test_secret",
    ])
    expect(requests.some((request) => request.url.includes("rk_test_secret"))).toBe(false)
  })

  it.each([
    [401, "invalid_credentials", false],
    [403, "insufficient_permissions", false],
    [408, "timeout", true],
    [429, "rate_limited", true],
    [503, "provider_unavailable", true],
  ] as const)("maps HTTP %d to %s", async (status, kind, retryable) => {
    const fetchImpl = async () => jsonResponse({}, status, { "request-id": "req_123" })
    const result = await fetchStripeMetrics(fetchImpl, "rk_test_123")
    expect(result).toEqual({
      ok: false,
      error: { kind, provider: "stripe", requestId: "req_123", retryable, status },
    })
  })

  it("uses Retry-After for rate limits", async () => {
    const fetchImpl = async () => jsonResponse({}, 429, { "retry-after": "45" })
    const result = await fetchStripeMetrics(fetchImpl, "rk_test_123")
    expect(result).toMatchObject({
      ok: false,
      error: { kind: "rate_limited", retryAfterMs: 45_000 },
    })
  })

  it("distinguishes offline and timeout failures", async () => {
    const offlineFetch = async () => {
      throw new TypeError("Failed to fetch")
    }
    const offline = await fetchStripeMetrics(offlineFetch, "rk_test_123", {
      online: false,
    })
    expect(offline).toMatchObject({ ok: false, error: { kind: "offline" } })

    const networkFailure = await fetchStripeMetrics(offlineFetch, "rk_test_123")
    expect(networkFailure).toMatchObject({ ok: false, error: { kind: "offline" } })

    const hangingFetch = (_input: URL | RequestInfo, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason))
      })
    const timeout = await fetchStripeMetrics(hangingFetch, "rk_test_123", {
      timeoutMs: 1,
    })
    expect(timeout).toMatchObject({ ok: false, error: { kind: "timeout" } })
  })

  it("rejects missing credentials, unsupported currencies, and invalid JSON", async () => {
    expect(await fetchStripeMetrics(fetch, "")).toMatchObject({
      ok: false,
      error: { kind: "missing_credentials" },
    })

    const eur = structuredClone(steadySubscriptions)
    eur.data[0].items.data[0].price.currency = "eur"
    const unsupported = await fetchStripeMetrics(async () => jsonResponse(eur), "rk_test_123")
    expect(unsupported).toMatchObject({ ok: false, error: { kind: "unsupported_data" } })

    const discounted = structuredClone(steadySubscriptions)
    Object.assign(discounted.data[0], { discounts: ["di_123"] })
    expect(
      await fetchStripeMetrics(async () => jsonResponse(discounted), "rk_test_123")
    ).toMatchObject({ ok: false, error: { kind: "unsupported_data" } })

    const invalidJson = await fetchStripeMetrics(
      async () => new Response("not-json", { status: 200 }),
      "rk_test_123"
    )
    expect(invalidJson).toMatchObject({ ok: false, error: { kind: "invalid_response" } })

    const malformed = await fetchStripeMetrics(
      async () => jsonResponse({ data: [{ id: "sub_bad" }], has_more: false }),
      "rk_test_123"
    )
    expect(malformed).toMatchObject({ ok: false, error: { kind: "invalid_response" } })
  })
})
