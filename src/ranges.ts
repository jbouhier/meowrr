import { animateStats } from "./animate"
import { fmt } from "./lib/format"
import { drawSparkline } from "./sparkline"
import { getCurrentRange, getMetricRanges, setCurrentRange } from "./state"
import type { RangeKey } from "./types"

function formatDelta(value: number, percent: number | null): string {
  const prefix = value > 0 ? "+" : ""
  if (percent !== null) return `${percent > 0 ? "+" : ""}${percent}%`
  return `${prefix}${fmt(value, true)}`
}

export function setRange(r: RangeKey, animate = true): void {
  document.querySelectorAll(".range-pill").forEach((b) => {
    const active = b.getAttribute("data-range") === r
    b.classList.toggle("active", active)
    b.setAttribute("aria-pressed", String(active))
  })
  if (r !== getCurrentRange()) setCurrentRange(r)
  const d = getMetricRanges()[r]

  const render = () => {
    const mrrEl = document.getElementById("mrr")
    const changeEl = document.getElementById("change")
    const changeShortEl = document.getElementById("change-short")
    if (!mrrEl || !changeEl || !changeShortEl) return

    mrrEl.textContent = fmt(d.metric, true)
    const delta = formatDelta(d.change, d.pct)
    changeEl.textContent = `${d.label} · ${delta} ${d.suffix}`
    changeShortEl.textContent = `${d.label} · ${delta}`
  }

  if (animate) animateStats(render)
  else render()

  drawSparkline(d.data, d.xLabels, animate)
}

export function copyMRR(): void {
  const text = document.getElementById("mrr")?.textContent
  if (!text) return
  navigator.clipboard
    .writeText(text)
    .then(() => {
      const toast = document.getElementById("copy-toast")
      if (!toast) return
      toast.classList.remove("hidden")
      setTimeout(() => toast.classList.add("hidden"), 2200)
    })
    .catch(() => undefined)
}

export function initRanges(): void {
  document.querySelectorAll(".range-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      const range = btn.getAttribute("data-range") as RangeKey
      if (range) setRange(range)
    })
  })

  setRange(getCurrentRange(), false)
}
