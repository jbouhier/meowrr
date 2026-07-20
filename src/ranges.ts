import { fmt } from "./lib/format"
import type { MetricRange, RangeKey } from "./types"
import { animateStats } from "./animate"
import { drawSparkline } from "./sparkline"
import { getCurrentRange, setCurrentRange } from "./state"

export const RANGES: Record<RangeKey, MetricRange> = {
  M: {
    label: "MRR",
    data: [22000, 24500, 26800, 28900, 30500, 32800, 35100, 37200, 38900, 40100, 41200, 42000],
    xLabels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    metric: 42000,
    change: 4269,
    pct: 11.3,
    suffix: "this month",
  },
  Y: {
    label: "ARR",
    data: [14400, 84000, 276000, 504000],
    xLabels: ["2022", "2023", "2024", "2025"],
    metric: 504000,
    change: 228000,
    pct: 82.6,
    suffix: "YoY",
  },
  A: {
    label: "MRR",
    data: [400, 1200, 2800, 5400, 9200, 14000, 20000, 28000, 35000, 38900, 40100, 42000],
    xLabels: null,
    metric: 42000,
    change: 41600,
    pct: null,
    suffix: "all time",
  },
}

export function setRange(r: RangeKey): void {
  document.querySelectorAll(".range-pill").forEach((b) => {
    b.classList.toggle("active", b.getAttribute("data-range") === r)
  })
  if (r === getCurrentRange()) return
  setCurrentRange(r)
  const d = RANGES[r]

  animateStats(() => {
    const mrrEl = document.getElementById("mrr")
    const changeEl = document.getElementById("change")
    const changeShortEl = document.getElementById("change-short")
    if (!mrrEl || !changeEl || !changeShortEl) return

    mrrEl.textContent = fmt(d.metric, true)
    const delta = d.pct !== null ? `+${d.pct}%` : `+${fmt(d.change, true)}`
    changeEl.textContent = `${d.label} · ${delta} ${d.suffix}`
    changeShortEl.textContent = `${d.label} · ${delta}`
  })

  drawSparkline(d.data, d.xLabels, true)
}

export function copyMRR(): void {
  const text = document.getElementById("mrr")?.textContent
  if (!text) return
  navigator.clipboard.writeText(text).then(() => {
    const toast = document.getElementById("copy-toast")
    if (!toast) return
    toast.classList.remove("hidden")
    setTimeout(() => toast.classList.add("hidden"), 2200)
  })
}

export function initRanges(): void {
  document.querySelectorAll(".range-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      const range = btn.getAttribute("data-range") as RangeKey
      if (range) setRange(range)
    })
  })

  setRange(getCurrentRange())
}
