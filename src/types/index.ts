export interface MetricRange {
  label: string
  data: number[]
  xLabels: string[] | null
  metric: number
  change: number
  pct: number | null
  suffix: string
}

export type RangeKey = "M" | "Y" | "A"

export const RANGE_KEYS = ["M", "Y", "A"] as const

export type PaymentProviderId = "stripe"

export type PaymentErrorKind =
  | "missing_credentials"
  | "invalid_credentials"
  | "insufficient_permissions"
  | "offline"
  | "timeout"
  | "rate_limited"
  | "provider_unavailable"
  | "unsupported_data"
  | "invalid_response"

export interface PaymentError {
  kind: PaymentErrorKind
  provider: PaymentProviderId
  retryable: boolean
  status?: number
  retryAfterMs?: number
  requestId?: string
}

export type PaymentResult<T> = { ok: true; value: T } | { ok: false; error: PaymentError }

export interface PaymentMetrics {
  currency: "usd"
  mrr: number
}

export interface PaymentRequestOptions {
  online?: boolean
  signal?: AbortSignal
  timeoutMs?: number
}

export interface MetricSnapshot {
  capturedAt: string
  currency: "usd"
  mrr: number
  provider: PaymentProviderId
}
