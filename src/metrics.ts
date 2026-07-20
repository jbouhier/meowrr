import type { MetricRange, MetricSnapshot, RangeKey } from "./types"

const SNAPSHOTS_KEY = "meowrr_metric_snapshots"
const MAX_SNAPSHOTS = 4 * 366

export const DEMO_RANGES: Record<RangeKey, MetricRange> = {
  M: {
    label: "MRR",
    data: [22000, 24500, 26800, 28900, 30500, 32800, 35100, 37200, 38900, 40100, 41200, 42000],
    xLabels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    metric: 42000,
    change: 4269,
    pct: 11.3,
    suffix: "demo",
  },
  Y: {
    label: "ARR",
    data: [14400, 84000, 276000, 504000],
    xLabels: ["2022", "2023", "2024", "2025"],
    metric: 504000,
    change: 228000,
    pct: 82.6,
    suffix: "demo",
  },
  A: {
    label: "MRR",
    data: [400, 1200, 2800, 5400, 9200, 14000, 20000, 28000, 35000, 38900, 40100, 42000],
    xLabels: null,
    metric: 42000,
    change: 41600,
    pct: null,
    suffix: "demo",
  },
}

function isSnapshot(value: unknown): value is MetricSnapshot {
  if (!value || typeof value !== "object") return false
  const snapshot = value as Partial<MetricSnapshot>
  return (
    snapshot.provider === "stripe" &&
    snapshot.currency === "usd" &&
    typeof snapshot.mrr === "number" &&
    Number.isFinite(snapshot.mrr) &&
    typeof snapshot.capturedAt === "string" &&
    Number.isFinite(Date.parse(snapshot.capturedAt))
  )
}

export function loadMetricSnapshots(
  storage: Pick<Storage, "getItem"> = localStorage
): MetricSnapshot[] {
  try {
    const raw = storage.getItem(SNAPSHOTS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isSnapshot).sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
  } catch {
    return []
  }
}

export function saveMetricSnapshot(
  snapshot: MetricSnapshot,
  storage: Pick<Storage, "getItem" | "setItem"> = localStorage,
  resetHistory = false
): MetricSnapshot[] {
  const snapshots = resetHistory ? [] : loadMetricSnapshots(storage)
  const day = snapshot.capturedAt.slice(0, 10)
  const existing = snapshots.findIndex((item) => item.capturedAt.slice(0, 10) === day)
  if (existing === -1) snapshots.push(snapshot)
  else snapshots[existing] = snapshot
  const retained = snapshots
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
    .slice(-MAX_SNAPSHOTS)
  try {
    storage.setItem(SNAPSHOTS_KEY, JSON.stringify(retained))
  } catch {
    // Live metrics should remain usable when persistence is temporarily unavailable.
  }
  return retained
}

export function clearMetricSnapshots(storage: Pick<Storage, "removeItem"> = localStorage): void {
  try {
    storage.removeItem(SNAPSHOTS_KEY)
  } catch {
    // Credential removal is handled separately; stale chart history is harmless.
  }
}

function latestByPeriod(
  snapshots: MetricSnapshot[],
  period: (date: Date) => string
): MetricSnapshot[] {
  const grouped = new Map<string, MetricSnapshot>()
  for (const snapshot of snapshots) grouped.set(period(new Date(snapshot.capturedAt)), snapshot)
  return [...grouped.values()].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
}

function change(
  current: number,
  previous: number | undefined
): Pick<MetricRange, "change" | "pct"> {
  if (previous === undefined) return { change: 0, pct: null }
  const amount = current - previous
  return {
    change: amount,
    pct: previous === 0 ? null : Number.parseFloat(((amount / previous) * 100).toFixed(1)),
  }
}

export function buildMetricRanges(snapshots: MetricSnapshot[]): Record<RangeKey, MetricRange> {
  const ordered = [...snapshots].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
  const current = ordered[ordered.length - 1]
  if (!current) return DEMO_RANGES

  const monthly = latestByPeriod(
    ordered,
    (date) => `${date.getUTCFullYear()}-${date.getUTCMonth()}`
  ).slice(-12)
  const yearly = latestByPeriod(ordered, (date) => String(date.getUTCFullYear())).slice(-4)
  const previousMonth = monthly[monthly.length - 2]?.mrr
  const previousYearArr = yearly[yearly.length - 2]?.mrr
  const currentArr = current.mrr * 12

  return {
    M: {
      label: "MRR",
      data: monthly.map((item) => item.mrr),
      xLabels: monthly.map((item) =>
        new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(
          new Date(item.capturedAt)
        )
      ),
      metric: current.mrr,
      ...change(current.mrr, previousMonth),
      suffix: "this month",
    },
    Y: {
      label: "ARR",
      data: yearly.map((item) => item.mrr * 12),
      xLabels: yearly.map((item) => String(new Date(item.capturedAt).getUTCFullYear())),
      metric: currentArr,
      ...change(currentArr, previousYearArr === undefined ? undefined : previousYearArr * 12),
      suffix: "YoY",
    },
    A: {
      label: "MRR",
      data: ordered.map((item) => item.mrr),
      xLabels: null,
      metric: current.mrr,
      ...change(current.mrr, ordered[0]?.mrr),
      suffix: "tracked",
    },
  }
}
