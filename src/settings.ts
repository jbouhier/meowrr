import { openUrl } from "@tauri-apps/plugin-opener"
import { fadeTransition } from "./animate"
import { clearMetricSnapshots } from "./metrics"
import { paymentMessage } from "./payment-messages"
import { setRange } from "./ranges"
import {
  applyStripeMetrics,
  connectStripe,
  refreshNow,
  resumePolling,
  updateRefreshText,
} from "./refresh"
import { getCurrentRange, getLastRefreshed, resetMetricsToDemo } from "./state"
import { readStorage, removeStorage, STORAGE_KEYS, writeStorage } from "./storage"

const widgetView = document.getElementById("widget-view")
const settingsView = document.getElementById("settings-view")
const settingsBtn = document.getElementById("settings-btn") as HTMLButtonElement | null
const settingsForm = document.getElementById("settings-form") as HTMLFormElement | null
const input = document.getElementById("api-key") as HTMLInputElement | null
const saveBtn = document.getElementById("save-btn") as HTMLButtonElement | null
const connectionMessage = document.getElementById("connection-message")
const creatorLink = document.getElementById("creator-link")
const CREATOR_URL = "https://jbouhier.com"

function setConnectionMessage(message: string, state: "error" | "progress" | "success"): void {
  if (!connectionMessage) return
  connectionMessage.textContent = message
  connectionMessage.dataset.state = state
}

export function loadSettings(): void {
  if (input) input.value = readStorage(STORAGE_KEYS.apiKey) ?? ""
  if (connectionMessage) {
    connectionMessage.textContent = ""
    connectionMessage.removeAttribute("data-state")
  }
}

export async function saveSettings(): Promise<boolean> {
  const candidate = input?.value.trim() ?? ""
  const previousKey = readStorage(STORAGE_KEYS.apiKey)
  if (!candidate) {
    if (!removeStorage(STORAGE_KEYS.apiKey)) {
      setConnectionMessage("Allow local app storage, then try disconnecting again.", "error")
      return false
    }
    clearMetricSnapshots()
    resetMetricsToDemo()
    setRange(getCurrentRange(), false)
    updateRefreshText()
    setConnectionMessage("Stripe disconnected. Demo data is active.", "success")
    void refreshNow()
    return true
  }

  if (saveBtn) {
    saveBtn.disabled = true
    saveBtn.textContent = "Checking…"
  }
  setConnectionMessage("Checking Stripe access…", "progress")

  try {
    const result = await connectStripe(candidate)
    if (!result.ok) {
      setConnectionMessage(paymentMessage(result.error, getLastRefreshed()).text, "error")
      if (previousKey) resumePolling()
      return false
    }
    if (!writeStorage(STORAGE_KEYS.apiKey, candidate)) {
      setConnectionMessage("Allow local app storage, then save again.", "error")
      if (previousKey) resumePolling()
      return false
    }
    applyStripeMetrics(result.value, candidate !== previousKey)
    setConnectionMessage("Stripe connected. Refreshing every minute.", "success")
    resumePolling()
    return true
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false
      saveBtn.textContent = "Save"
    }
  }
}

export function openSettings(): void {
  if (!widgetView || !settingsView) return
  fadeTransition(widgetView, settingsView, () => {
    loadSettings()
    input?.focus()
  })
}

export function closeSettings(): void {
  if (!settingsView || !widgetView) return
  fadeTransition(settingsView, widgetView, () => settingsBtn?.focus())
}

async function saveAndClose(): Promise<void> {
  if (await saveSettings()) closeSettings()
}

export function initSettings(): void {
  const backBtn = document.getElementById("back-btn")
  settingsBtn?.addEventListener("click", openSettings)
  if (backBtn) backBtn.addEventListener("click", closeSettings)
  settingsForm?.addEventListener("submit", (event) => {
    event.preventDefault()
    void saveAndClose()
  })
  input?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return
    event.preventDefault()
    void saveAndClose()
  })
  creatorLink?.addEventListener("click", () => {
    void openUrl(CREATOR_URL).catch(() => {
      setConnectionMessage("Visit jbouhier.com in your browser.", "error")
    })
  })
}
