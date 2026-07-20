import type { PaymentError, PaymentMetrics, PaymentRequestOptions, PaymentResult } from "../types"

export const STRIPE_SUBSCRIPTIONS_URL = "https://api.stripe.com/v1/subscriptions"
export const STRIPE_REQUEST_TIMEOUT_MS = 10_000

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

type StripeInterval = "day" | "week" | "month" | "year"

interface StripePrice {
  billing_scheme: "per_unit" | "tiered"
  currency: string
  recurring: {
    interval: StripeInterval
    interval_count: number
    usage_type: "licensed" | "metered"
  } | null
  unit_amount: number | null
  unit_amount_decimal?: string | null
}

interface StripeSubscriptionItem {
  discount?: unknown
  discounts?: unknown[]
  price: StripePrice
  quantity: number | null
}

interface StripeSubscription {
  discount?: unknown
  discounts?: unknown[]
  id: string
  items: { data: StripeSubscriptionItem[] }
  status: string
}

interface StripeSubscriptionList {
  data: StripeSubscription[]
  has_more: boolean
}

export type StripeMetrics = PaymentMetrics
export type StripeRequestOptions = PaymentRequestOptions

function failure(
  kind: PaymentError["kind"],
  retryable: boolean,
  details: Omit<PaymentError, "kind" | "provider" | "retryable"> = {}
): PaymentResult<never> {
  return { ok: false, error: { kind, provider: "stripe", retryable, ...details } }
}

function errorForResponse(response: Response): PaymentResult<never> {
  const details = {
    requestId: response.headers.get("request-id") ?? undefined,
    status: response.status,
  }
  if (response.status === 401) return failure("invalid_credentials", false, details)
  if (response.status === 403) return failure("insufficient_permissions", false, details)
  if (response.status === 408) return failure("timeout", true, details)
  if (response.status === 429) {
    const retryAfter = Number.parseFloat(response.headers.get("retry-after") ?? "")
    return failure("rate_limited", true, {
      ...details,
      retryAfterMs: Number.isFinite(retryAfter) ? retryAfter * 1000 : undefined,
    })
  }
  if (response.status >= 500) return failure("provider_unavailable", true, details)
  return failure("invalid_response", false, details)
}

function isSubscriptionList(value: unknown): value is StripeSubscriptionList {
  if (!value || typeof value !== "object") return false
  const list = value as Partial<StripeSubscriptionList>
  if (!Array.isArray(list.data) || typeof list.has_more !== "boolean") return false

  return list.data.every((candidate) => {
    if (!candidate || typeof candidate !== "object") return false
    const subscription = candidate as Partial<StripeSubscription>
    if (
      typeof subscription.id !== "string" ||
      typeof subscription.status !== "string" ||
      !subscription.items ||
      !Array.isArray(subscription.items.data)
    ) {
      return false
    }

    return subscription.items.data.every((candidateItem) => {
      if (!candidateItem || typeof candidateItem !== "object") return false
      const item = candidateItem as Partial<StripeSubscriptionItem>
      const price = item.price as Partial<StripePrice> | undefined
      const recurring = price?.recurring
      return (
        (item.quantity === null || typeof item.quantity === "number") &&
        !!price &&
        (price.billing_scheme === "per_unit" || price.billing_scheme === "tiered") &&
        typeof price.currency === "string" &&
        (price.unit_amount === null || typeof price.unit_amount === "number") &&
        (recurring === null ||
          (!!recurring &&
            ["day", "week", "month", "year"].includes(recurring.interval) &&
            typeof recurring.interval_count === "number" &&
            (recurring.usage_type === "licensed" || recurring.usage_type === "metered")))
      )
    })
  })
}

function monthlyAmount(price: StripePrice, quantity: number): number | null {
  const recurring = price.recurring
  if (recurring?.usage_type !== "licensed" || price.billing_scheme !== "per_unit") {
    return null
  }

  const amount = Number.parseFloat(price.unit_amount_decimal ?? String(price.unit_amount ?? ""))
  if (!Number.isFinite(amount) || recurring.interval_count < 1) return null

  const perInterval = amount * quantity
  switch (recurring.interval) {
    case "day":
      return (perInterval * (365 / 12)) / recurring.interval_count
    case "week":
      return (perInterval * (52 / 12)) / recurring.interval_count
    case "month":
      return perInterval / recurring.interval_count
    case "year":
      return perInterval / (12 * recurring.interval_count)
  }
}

function mergeSignals(parent: AbortSignal | undefined, controller: AbortController): () => void {
  if (!parent) return () => undefined
  const abort = () => controller.abort(parent.reason)
  if (parent.aborted) abort()
  else parent.addEventListener("abort", abort, { once: true })
  return () => parent.removeEventListener("abort", abort)
}

export async function fetchStripeMetrics(
  fetchImpl: FetchLike,
  key: string | undefined,
  options: StripeRequestOptions = {}
): Promise<PaymentResult<StripeMetrics>> {
  if (!key?.trim()) return failure("missing_credentials", false)

  const controller = new AbortController()
  const removeParentListener = mergeSignals(options.signal, controller)
  const timeout = setTimeout(
    () => controller.abort(new DOMException("Stripe request timed out", "AbortError")),
    options.timeoutMs ?? STRIPE_REQUEST_TIMEOUT_MS
  )

  try {
    const subscriptions: StripeSubscription[] = []
    let startingAfter: string | undefined

    for (let page = 0; page < 100; page += 1) {
      const url = new URL(STRIPE_SUBSCRIPTIONS_URL)
      url.searchParams.set("limit", "100")
      url.searchParams.append("expand[]", "data.items.data.price")
      if (startingAfter) url.searchParams.set("starting_after", startingAfter)

      const response = await fetchImpl(url, {
        headers: { Authorization: `Bearer ${key}` },
        signal: controller.signal,
      })
      if (!response.ok) return errorForResponse(response)

      let body: unknown
      try {
        body = await response.json()
      } catch {
        return failure("invalid_response", false, {
          requestId: response.headers.get("request-id") ?? undefined,
          status: response.status,
        })
      }
      if (!isSubscriptionList(body)) return failure("invalid_response", false)

      subscriptions.push(...body.data)
      if (!body.has_more) break
      startingAfter = body.data[body.data.length - 1]?.id
      if (!startingAfter || page === 99) return failure("invalid_response", false)
    }

    let monthlyMinorUnits = 0
    const currencies = new Set<string>()
    for (const subscription of subscriptions) {
      if (subscription.status !== "active" && subscription.status !== "past_due") continue
      if (subscription.discount || subscription.discounts?.length) {
        return failure("unsupported_data", false)
      }
      for (const item of subscription.items.data) {
        if (item.discount || item.discounts?.length) return failure("unsupported_data", false)
        const recurring = item.price.recurring
        if (recurring?.usage_type === "metered" || item.price.unit_amount === 0) continue
        const monthly = monthlyAmount(item.price, item.quantity ?? 1)
        if (monthly === null) return failure("unsupported_data", false)
        currencies.add(item.price.currency)
        monthlyMinorUnits += monthly
      }
    }

    if (currencies.size > 1 || (currencies.size === 1 && !currencies.has("usd"))) {
      return failure("unsupported_data", false)
    }

    return {
      ok: true,
      value: {
        currency: "usd",
        mrr: Number.parseFloat((monthlyMinorUnits / 100).toFixed(2)),
      },
    }
  } catch (error) {
    if (controller.signal.aborted && !options.signal?.aborted) return failure("timeout", true)
    if (options.online === false) return failure("offline", true)
    if (error instanceof DOMException && error.name === "AbortError")
      return failure("timeout", true)
    if (error instanceof TypeError) return failure("offline", true)
    return failure("provider_unavailable", true)
  } finally {
    clearTimeout(timeout)
    removeParentListener()
  }
}

export async function validateStripeKey(
  fetchImpl: FetchLike,
  key: string | undefined,
  options?: StripeRequestOptions
): Promise<PaymentResult<StripeMetrics>> {
  return fetchStripeMetrics(fetchImpl, key, options)
}
