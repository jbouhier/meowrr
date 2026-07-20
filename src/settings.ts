import { validateStripeKey } from "./lib/stripe"
import { fadeTransition } from "./animate"
import { updateRefreshText } from "./refresh"
import { setLastRefreshed } from "./state"

const widgetView = document.getElementById("widget-view")
const settingsView = document.getElementById("settings-view")

export async function checkStripe(): Promise<void> {
  const key = localStorage.getItem("meowrr_api_key")
  if (!key) return // no key → demo data, no error
  const banner = document.getElementById("error-banner")
  if (!banner) return

  const result = await validateStripeKey(fetch, key)
  banner.classList.toggle("hidden", result.ok)
  if (result.ok) {
    setLastRefreshed(new Date())
    updateRefreshText()
  }
}

export function loadSettings(): void {
  const saved = localStorage.getItem("meowrr_api_key")
  const input = document.getElementById("api-key") as HTMLInputElement | null
  if (saved && input) input.value = saved
}

export function saveSettings(): void {
  const input = document.getElementById("api-key") as HTMLInputElement | null
  const key = input?.value.trim() ?? ""
  if (key) localStorage.setItem("meowrr_api_key", key)
  else localStorage.removeItem("meowrr_api_key")
  checkStripe()
}

export function openSettings(): void {
  if (!widgetView || !settingsView) return
  fadeTransition(widgetView, settingsView, loadSettings)
}

export function closeSettings(): void {
  if (!settingsView || !widgetView) return
  fadeTransition(settingsView, widgetView, saveSettings)
}

export function initSettings(): void {
  const settingsBtn = document.getElementById("settings-btn")
  const backBtn = document.getElementById("back-btn")
  const saveBtn = document.getElementById("save-btn")
  if (settingsBtn) settingsBtn.addEventListener("click", openSettings)
  if (backBtn) backBtn.addEventListener("click", closeSettings)
  if (saveBtn) saveBtn.addEventListener("click", closeSettings)

  checkStripe()
}
