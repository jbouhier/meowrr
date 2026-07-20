import {
  getAlwaysOnTop,
  setAlwaysOnTopState,
  getIsMaximized,
  setIsMaximized,
  getDragAbort,
  setDragAbort,
} from "./state"

const ICON_MAXIMIZE = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`
const ICON_RESTORE = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/></svg>`

const pinBtn = document.getElementById("pin-btn")
const maximizeBtn = document.getElementById("maximize-btn")
const closeBtn = document.getElementById("close-btn")

export async function setAlwaysOnTop(value: boolean): Promise<void> {
  setAlwaysOnTopState(value)
  await window.__TAURI__.core.invoke("set_always_on_top", { value })
  if (!pinBtn) return
  pinBtn.classList.toggle("pinned", value)
  pinBtn.dataset.tip = value ? "Unpin [T]" : "Keep on top [T]"
}

export async function toggleMaximize(): Promise<void> {
  await window.__TAURI__.core.invoke("toggle_maximize")
  const isMax = !getIsMaximized()
  setIsMaximized(isMax)
  const widgetView = document.getElementById("widget-view")
  if (!maximizeBtn || !widgetView) return
  maximizeBtn.innerHTML = isMax ? ICON_RESTORE : ICON_MAXIMIZE
  maximizeBtn.title = isMax ? "Restore" : "Maximize"
  widgetView.classList.toggle("maximized", isMax)
}

export async function closeWindow(): Promise<void> {
  await window.__TAURI__.core.invoke("close_app")
}

export function initWindow(): void {
  if (getAlwaysOnTop()) {
    window.__TAURI__.core.invoke("set_always_on_top", { value: true })
    if (pinBtn) {
      pinBtn.classList.add("pinned")
      pinBtn.dataset.tip = "Unpin [T]"
    }
  }
  if (pinBtn) pinBtn.addEventListener("click", () => setAlwaysOnTop(!getAlwaysOnTop()))
  if (maximizeBtn) maximizeBtn.addEventListener("click", toggleMaximize)
  if (closeBtn) closeBtn.addEventListener("click", closeWindow)

  document.addEventListener("mousedown", (e) => {
    if (
      e.button !== 0 ||
      (e.target instanceof Element && e.target.closest("button, input, [role='switch']"))
    )
      return

    const existing = getDragAbort()
    if (existing) existing.abort()
    const dragAbort = new AbortController()
    setDragAbort(dragAbort)
    const { signal } = dragAbort

    const startX = e.clientX
    const startY = e.clientY

    document.addEventListener(
      "mousemove",
      (ev) => {
        if (Math.abs(ev.clientX - startX) > 3 || Math.abs(ev.clientY - startY) > 3) {
          window.__TAURI__.core.invoke("plugin:window|start_dragging")
          dragAbort.abort()
        }
      },
      { signal }
    )

    document.addEventListener("mouseup", () => dragAbort.abort(), { signal, once: true })
  })
}
