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

export const RANGE_KEYS: RangeKey[] = ["M", "Y", "A"]
