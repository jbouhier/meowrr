import type { RangeKey } from "./types"
import { setRange, copyMRR } from "./ranges"
import { openSettings, closeSettings } from "./settings"
import { toggleMaximize, setAlwaysOnTop, closeWindow } from "./window"
import { getAlwaysOnTop, getCurrentRange, getIsMaximized } from "./state"

const shortcutsOverlay = document.getElementById("shortcuts-overlay")
const settingsView = document.getElementById("settings-view")

const RANGE_ORDER: RangeKey[] = ["M", "Y", "A"]

export function initShortcuts(): void {
  document.addEventListener("keyup", (e) => {
    if (e.key === "Tab" && shortcutsOverlay) shortcutsOverlay.classList.remove("visible")
  })

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return // ignore modified keys
    const inSettings = settingsView ? !settingsView.classList.contains("hidden") : false

    if (e.key === "Tab") {
      e.preventDefault()
      if (!inSettings && shortcutsOverlay) shortcutsOverlay.classList.add("visible")
      return
    }

    if (e.key === "Escape") {
      if (inSettings) closeSettings()
      else if (getIsMaximized()) toggleMaximize()
    } else if (!inSettings) {
      if (e.key === "m" || e.key === "M") setRange("M")
      else if (e.key === "y" || e.key === "Y") setRange("Y")
      else if (e.key === "a" || e.key === "A") setRange("A")
      else if (e.key === "ArrowRight") {
        setRange(RANGE_ORDER[(RANGE_ORDER.indexOf(getCurrentRange()) + 1) % 3])
      } else if (e.key === "ArrowLeft") {
        setRange(RANGE_ORDER[(RANGE_ORDER.indexOf(getCurrentRange()) + 2) % 3])
      } else if (e.key === "c" || e.key === "C") copyMRR()
      else if (e.key === "f" || e.key === "F") toggleMaximize()
      else if (e.key === "t" || e.key === "T") setAlwaysOnTop(!getAlwaysOnTop())
      else if (e.key === "x" || e.key === "X") {
        const axisToggle = document.getElementById("axis-toggle")
        axisToggle?.click()
      } else if (e.key === "s" || e.key === "S") openSettings()
      else if (e.key === "q" || e.key === "Q") closeWindow()
    }
  })
}
