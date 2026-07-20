import { describe, expect, it } from "bun:test"
import { choppyDecline, edgeCases, steadyGrowth } from "../tests/fixtures/metric-scenarios"
import { buildMetricRanges, loadMetricSnapshots, saveMetricSnapshot } from "./metrics"

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  }
}

describe("metric snapshots", () => {
  it("builds growing monthly and annual ranges", () => {
    const ranges = buildMetricRanges(steadyGrowth)
    expect(ranges.M.data).toEqual([1000, 1250, 1500])
    expect(ranges.M.change).toBe(250)
    expect(ranges.M.pct).toBe(20)
    expect(ranges.Y.metric).toBe(18_000)
  })

  it("preserves negative changes and choppy data", () => {
    const ranges = buildMetricRanges(choppyDecline)
    expect(ranges.M.data).toEqual([1500, 1200, 1300])
    expect(ranges.A.change).toBe(-200)
    expect(ranges.A.pct).toBe(-13.3)
  })

  it("handles zero baselines and large values", () => {
    const ranges = buildMetricRanges(edgeCases)
    expect(ranges.M.metric).toBe(1_250_000)
    expect(ranges.M.pct).toBeNull()
    expect(ranges.M.data).toEqual([0, 0, 1_250_000])
  })

  it("keeps only the latest snapshot for a UTC day", () => {
    const storage = memoryStorage()
    saveMetricSnapshot(steadyGrowth[0], storage)
    saveMetricSnapshot(
      { ...steadyGrowth[0], capturedAt: "2026-01-31T18:00:00.000Z", mrr: 1100 },
      storage
    )
    expect(loadMetricSnapshots(storage)).toEqual([
      { ...steadyGrowth[0], capturedAt: "2026-01-31T18:00:00.000Z", mrr: 1100 },
    ])
  })

  it("starts fresh history when the connected account changes", () => {
    const storage = memoryStorage()
    saveMetricSnapshot(steadyGrowth[0], storage)
    const replacement = saveMetricSnapshot(steadyGrowth[2], storage, true)
    expect(replacement).toEqual([steadyGrowth[2]])
    expect(loadMetricSnapshots(storage)).toEqual([steadyGrowth[2]])
  })
})
