import type { PaymentError } from "./types"

export interface PaymentMessage {
  action: "open_settings" | "retry" | null
  text: string
}

function staleSuffix(updatedAt: Date | null): string {
  if (!updatedAt) return ""
  const minutes = Math.max(1, Math.floor((Date.now() - updatedAt.getTime()) / 60_000))
  return ` — showing data from ${minutes}m ago`
}

export function paymentMessage(error: PaymentError, updatedAt: Date | null): PaymentMessage {
  const stale = staleSuffix(updatedAt)
  switch (error.kind) {
    case "missing_credentials":
      return { action: "open_settings", text: "Connect Stripe in Settings to show live revenue." }
    case "invalid_credentials":
      return { action: "open_settings", text: "Update your Stripe token in Settings." }
    case "insufficient_permissions":
      return {
        action: "open_settings",
        text: "Add subscription read access to this Stripe token, then try again.",
      }
    case "offline":
      return { action: null, text: `Waiting for internet — retrying automatically${stale}.` }
    case "timeout":
      return { action: "retry", text: `Still trying Stripe${stale} — retrying automatically.` }
    case "rate_limited": {
      const seconds = Math.max(1, Math.ceil((error.retryAfterMs ?? 60_000) / 1000))
      return { action: null, text: `Retrying Stripe in ${seconds}s${stale}.` }
    }
    case "provider_unavailable":
      return { action: "retry", text: `Retrying Stripe automatically${stale}.` }
    case "unsupported_data":
      return {
        action: "open_settings",
        text: "Connect an account with USD fixed-price subscriptions, or keep demo data for now.",
      }
    case "invalid_response":
      return { action: "retry", text: "Try again now. If it keeps failing, reconnect Stripe." }
  }
}
