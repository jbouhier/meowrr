import { buildMetricRanges, DEMO_RANGES, loadMetricSnapshots } from "./metrics"
import { readStorage, STORAGE_KEYS, writeStorage } from "./storage"
import { type MetricRange, type MetricSnapshot, RANGE_KEYS, type RangeKey } from "./types"

const storedRange = readStorage(STORAGE_KEYS.range)
let currentRange: RangeKey = RANGE_KEYS.includes(storedRange as RangeKey)
  ? (storedRange as RangeKey)
  : "M"
let showAxis = readStorage(STORAGE_KEYS.showAxis) === "true"
let alwaysOnTop = readStorage(STORAGE_KEYS.alwaysOnTop) === "true"
let isMaximized = false
const storedSnapshots = readStorage(STORAGE_KEYS.apiKey) ? loadMetricSnapshots() : []
let metricRanges = storedSnapshots.length > 0 ? buildMetricRanges(storedSnapshots) : DEMO_RANGES
let lastRefreshed: Date | null = storedSnapshots.length
  ? new Date(storedSnapshots[storedSnapshots.length - 1].capturedAt)
  : null
let dataSource: "demo" | "stripe" = storedSnapshots.length > 0 ? "stripe" : "demo"

export const getCurrentRange = (): RangeKey => currentRange
export const setCurrentRange = (r: RangeKey): void => {
  currentRange = r
  writeStorage(STORAGE_KEYS.range, r)
}

export const getShowAxis = (): boolean => showAxis
export const setShowAxis = (v: boolean): void => {
  showAxis = v
  writeStorage(STORAGE_KEYS.showAxis, String(showAxis))
}

export const getAlwaysOnTop = (): boolean => alwaysOnTop
export const setAlwaysOnTopState = (v: boolean): void => {
  alwaysOnTop = v
  writeStorage(STORAGE_KEYS.alwaysOnTop, String(v))
}

export const getIsMaximized = (): boolean => isMaximized
export const setIsMaximized = (v: boolean): void => {
  isMaximized = v
}

export const getLastRefreshed = (): Date | null => lastRefreshed
export const setLastRefreshed = (d: Date | null): void => {
  lastRefreshed = d
}

export const getMetricRanges = (): Record<RangeKey, MetricRange> => metricRanges
export const setMetricSnapshots = (snapshots: MetricSnapshot[]): void => {
  metricRanges = buildMetricRanges(snapshots)
  const latest = snapshots[snapshots.length - 1]
  lastRefreshed = latest ? new Date(latest.capturedAt) : null
  dataSource = latest ? "stripe" : "demo"
}

export const resetMetricsToDemo = (): void => {
  metricRanges = DEMO_RANGES
  lastRefreshed = null
  dataSource = "demo"
}

export const getDataSource = (): "demo" | "stripe" => dataSource
