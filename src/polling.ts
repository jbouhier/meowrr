import type { PaymentError } from "./types"

export const POLL_INTERVAL_MS = 60_000
export const POLL_JITTER_RATIO = 0.1
export const MAX_BACKOFF_MS = 15 * 60_000

export function nextPollDelay(random = Math.random): number {
  const normalizedRandom = Math.min(Math.max(random(), 0), 1)
  const jitterMultiplier = 1 - POLL_JITTER_RATIO + normalizedRandom * POLL_JITTER_RATIO * 2
  return Math.round(POLL_INTERVAL_MS * jitterMultiplier)
}

export function retryDelay(error: PaymentError, consecutiveFailures: number): number | null {
  if (!error.retryable) return null
  if (error.retryAfterMs !== undefined) {
    return Math.min(Math.max(error.retryAfterMs, 1_000), MAX_BACKOFF_MS)
  }
  const exponent = Math.min(Math.max(consecutiveFailures - 1, 0), 4)
  return Math.min(POLL_INTERVAL_MS * 2 ** exponent, MAX_BACKOFF_MS)
}
