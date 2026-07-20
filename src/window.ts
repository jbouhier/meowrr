import { invoke } from "@tauri-apps/api/core"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { getAlwaysOnTop, getIsMaximized, setAlwaysOnTopState, setIsMaximized } from "./state"

const ICON_MAXIMIZE = `<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`
const ICON_RESTORE = `<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/></svg>`

const pinBtn = document.getElementById("pin-btn")
const maximizeBtn = document.getElementById("maximize-btn")
const closeBtn = document.getElementById("close-btn")
let pinPending = false
let maximizePending = false

function renderPin(value: boolean): void {
  if (!pinBtn) return
  pinBtn.classList.toggle("pinned", value)
  pinBtn.dataset.tip = value ? "Unpin [T]" : "Keep on top [T]"
  pinBtn.setAttribute("aria-label", value ? "Stop keeping on top" : "Keep on top")
}

function renderMaximize(value: boolean): void {
  const widgetView = document.getElementById("widget-view")
  if (!maximizeBtn || !widgetView) return
  maximizeBtn.innerHTML = value ? ICON_RESTORE : ICON_MAXIMIZE
  maximizeBtn.title = value ? "Restore" : "Maximize"
  maximizeBtn.setAttribute("aria-label", value ? "Restore" : "Fullscreen")
  widgetView.classList.toggle("maximized", value)
}

export async function setAlwaysOnTop(value: boolean): Promise<void> {
  if (pinPending) return
  pinPending = true
  try {
    const applied = await invoke<boolean>("set_always_on_top", { value })
    setAlwaysOnTopState(applied)
    renderPin(applied)
  } catch {
    renderPin(getAlwaysOnTop())
  } finally {
    pinPending = false
  }
}

export async function toggleMaximize(): Promise<void> {
  if (maximizePending) return
  maximizePending = true
  try {
    const isMaximized = await invoke<boolean>("toggle_maximize")
    setIsMaximized(isMaximized)
    renderMaximize(isMaximized)
  } catch {
    renderMaximize(getIsMaximized())
  } finally {
    maximizePending = false
  }
}

export async function closeWindow(): Promise<void> {
  await invoke("close_app")
}

export function initWindow(): void {
  renderPin(getAlwaysOnTop())
  renderMaximize(getIsMaximized())
  if (getAlwaysOnTop()) void setAlwaysOnTop(true)

  pinBtn?.addEventListener("click", () => void setAlwaysOnTop(!getAlwaysOnTop()))
  maximizeBtn?.addEventListener("click", () => void toggleMaximize())
  closeBtn?.addEventListener("click", () => void closeWindow())

  let dragAbort: AbortController | null = null
  document.addEventListener("mousedown", (event) => {
    if (
      event.button !== 0 ||
      (event.target instanceof Element && event.target.closest("button, input, [role='switch']"))
    ) {
      return
    }

    dragAbort?.abort()
    dragAbort = new AbortController()
    const { signal } = dragAbort
    const startX = event.clientX
    const startY = event.clientY

    document.addEventListener(
      "mousemove",
      (moveEvent) => {
        if (Math.abs(moveEvent.clientX - startX) > 3 || Math.abs(moveEvent.clientY - startY) > 3) {
          void getCurrentWindow()
            .startDragging()
            .catch(() => undefined)
          dragAbort?.abort()
        }
      },
      { signal }
    )
    document.addEventListener("mouseup", () => dragAbort?.abort(), { signal, once: true })
  })
}
