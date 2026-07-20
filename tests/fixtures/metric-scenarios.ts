import type { MetricSnapshot } from "../../src/types"

function snapshot(capturedAt: string, mrr: number): MetricSnapshot {
  return { capturedAt, currency: "usd", mrr, provider: "stripe" }
}

export const steadyGrowth = [
  snapshot("2026-01-31T12:00:00.000Z", 1000),
  snapshot("2026-02-28T12:00:00.000Z", 1250),
  snapshot("2026-03-31T12:00:00.000Z", 1500),
]

export const choppyDecline = [
  snapshot("2026-01-31T12:00:00.000Z", 1500),
  snapshot("2026-02-28T12:00:00.000Z", 1200),
  snapshot("2026-03-31T12:00:00.000Z", 1300),
]

export const edgeCases = [
  snapshot("2025-12-31T12:00:00.000Z", 0),
  snapshot("2026-01-31T12:00:00.000Z", 0),
  snapshot("2026-02-28T12:00:00.000Z", 1_250_000),
]
