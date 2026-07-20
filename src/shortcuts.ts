import { copyMRR, setRange } from "./ranges"
import { closeSettings, openSettings } from "./settings"
import { shortcutOverlayAction } from "./shortcut-overlay"
import { getAlwaysOnTop, getCurrentRange, getIsMaximized } from "./state"
import { dismissTabHint } from "./tab-hint"
import type { RangeKey } from "./types"
import { closeWindow, setAlwaysOnTop, toggleMaximize } from "./window"

const shortcutsOverlay = document.getElementById("shortcuts-overlay")
const shortcutsClose = document.getElementById("shortcuts-close")
const tabHint = document.getElementById("tab-hint")
const settingsView = document.getElementById("settings-view")

const RANGE_ORDER: RangeKey[] = ["M", "Y", "A"]

function setShortcutsVisible(visible: boolean): void {
  if (!shortcutsOverlay) return
  shortcutsOverlay.classList.toggle("visible", visible)
  shortcutsOverlay.setAttribute("aria-hidden", String(!visible))
  if (shortcutsClose) shortcutsClose.tabIndex = visible ? 0 : -1
}

function openShortcuts(): void {
  dismissTabHint()
  setShortcutsVisible(true)
  shortcutsClose?.focus()
}

function closeShortcuts(): void {
  setShortcutsVisible(false)
}

export function initShortcuts(): void {
  shortcutsClose?.addEventListener("click", closeShortcuts)
  tabHint?.addEventListener("click", openShortcuts)

  document.addEventListener("keydown", (e) => {
    const inSettings = settingsView ? !settingsView.classList.contains("hidden") : false
    const overlayVisible = shortcutsOverlay?.classList.contains("visible") ?? false
    const overlayAction = shortcutOverlayAction(
      e.key,
      overlayVisible,
      inSettings,
      e.repeat,
      e.ctrlKey || e.metaKey || e.altKey
    )

    if (overlayAction) {
      if (e.key === "Tab") dismissTabHint()
      setShortcutsVisible(overlayAction === "show")
      return
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return // ignore modified keys

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
      } else if (e.key === "s" || e.key === "S") {
        closeShortcuts()
        openSettings()
      } else if (e.key === "q" || e.key === "Q") closeWindow()
    }
  })
}
