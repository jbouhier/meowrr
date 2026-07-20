import { getLastRefreshed, setLastRefreshed } from "./state"

export function updateRefreshText(): void {
  const secs = Math.floor((Date.now() - getLastRefreshed().getTime()) / 1000)
  const el = document.getElementById("refresh-text")
  if (!el) return
  if (secs < 60) el.textContent = `Updated ${secs}s ago`
  else if (secs < 3600) el.textContent = `Updated ${Math.floor(secs / 60)}m ago`
  else el.textContent = `Updated ${Math.floor(secs / 3600)}h ago`
}

export function initRefresh(): void {
  setLastRefreshed(new Date())
  setInterval(updateRefreshText, 30000)
  updateRefreshText()
}
