import { describe, expect, it } from "bun:test"
import { paymentMessage } from "./payment-messages"
import type { PaymentErrorKind } from "./types"

const kinds: PaymentErrorKind[] = [
  "missing_credentials",
  "invalid_credentials",
  "insufficient_permissions",
  "offline",
  "timeout",
  "rate_limited",
  "provider_unavailable",
  "unsupported_data",
  "invalid_response",
]

describe("paymentMessage", () => {
  it("provides a user action or explains an automatic retry for every error", () => {
    for (const kind of kinds) {
      const message = paymentMessage(
        { kind, provider: "stripe", retryable: true, retryAfterMs: 30_000 },
        null
      )
      expect(message.text.length).toBeGreaterThan(0)
      expect(message.action !== null || /retry|waiting/i.test(message.text)).toBe(true)
    }
  })

  it("adds data freshness context when the app keeps showing cached data", () => {
    const updatedAt = new Date(Date.now() - 5 * 60_000)
    const message = paymentMessage(
      { kind: "offline", provider: "stripe", retryable: true },
      updatedAt
    )
    expect(message.text).toContain("showing data from 5m ago")
  })
})
