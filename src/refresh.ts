import { saveMetricSnapshot } from "./metrics"
import { paymentMessage } from "./payment-messages"
import { nextPollDelay, POLL_INTERVAL_MS, retryDelay } from "./polling"
import { stripeProvider } from "./providers"
import { setRange } from "./ranges"
import {
  getCurrentRange,
  getDataSource,
  getLastRefreshed,
  resetMetricsToDemo,
  setMetricSnapshots,
} from "./state"
import { readStorage, STORAGE_KEYS } from "./storage"
import type { PaymentError, PaymentMetrics, PaymentResult } from "./types"

let pollTimer: ReturnType<typeof setTimeout> | null = null
let activeAbort: AbortController | null = null
let generation = 0
let failures = 0
let automaticRetriesPaused = false

const banner = document.getElementById("error-banner")
const bannerMessage = document.getElementById("error-message")
const bannerAction = document.getElementById("error-action") as HTMLButtonElement | null

function stopTimer(): void {
  if (pollTimer) clearTimeout(pollTimer)
  pollTimer = null
}

function pollingAllowed(): boolean {
  return navigator.onLine && !document.hidden
}

function schedule(delay: number): void {
  stopTimer()
  if (!pollingAllowed()) return
  pollTimer = setTimeout(() => {
    pollTimer = null
    void refreshNow()
  }, delay)
}

function cancelActiveRequest(): void {
  generation += 1
  activeAbort?.abort()
  activeAbort = null
}

function renderReady(): void {
  banner?.classList.add("hidden")
  if (bannerMessage) bannerMessage.textContent = ""
  if (bannerAction) bannerAction.classList.add("hidden")
}

export function renderPaymentError(error: PaymentError): void {
  const message = paymentMessage(error, getLastRefreshed())
  if (bannerMessage) bannerMessage.textContent = message.text
  if (bannerAction) {
    bannerAction.classList.toggle("hidden", message.action === null)
    bannerAction.dataset.action = message.action ?? ""
    bannerAction.textContent = message.action === "open_settings" ? "Settings" : "Retry now"
  }
  banner?.classList.remove("hidden")
}

export function applyStripeMetrics(metrics: PaymentMetrics, resetHistory = false): void {
  const capturedAt = new Date().toISOString()
  const snapshots = saveMetricSnapshot(
    {
      capturedAt,
      currency: metrics.currency,
      mrr: metrics.mrr,
      provider: "stripe",
    },
    localStorage,
    resetHistory
  )
  setMetricSnapshots(snapshots)
  setRange(getCurrentRange(), false)
  updateRefreshText()
  renderReady()
}

async function requestMetrics(key: string): Promise<PaymentResult<PaymentMetrics> | null> {
  activeAbort?.abort()
  const controller = new AbortController()
  activeAbort = controller
  const requestGeneration = ++generation
  const result = await stripeProvider.fetchMetrics(fetch, key, {
    online: navigator.onLine,
    signal: controller.signal,
  })
  if (requestGeneration !== generation) return null
  activeAbort = null
  return result
}

export async function connectStripe(key: string): Promise<PaymentResult<PaymentMetrics>> {
  const result = await requestMetrics(key)
  if (!result) {
    return {
      ok: false,
      error: { kind: "timeout", provider: "stripe", retryable: true },
    }
  }
  return result
}

export async function refreshNow(): Promise<void> {
  if (activeAbort) return
  const key = readStorage(STORAGE_KEYS.apiKey)
  if (!key) {
    stopTimer()
    automaticRetriesPaused = false
    resetMetricsToDemo()
    setRange(getCurrentRange(), false)
    renderReady()
    updateRefreshText()
    return
  }
  if (!navigator.onLine) {
    stopTimer()
    renderPaymentError({ kind: "offline", provider: "stripe", retryable: true })
    updateRefreshText()
    return
  }
  if (document.hidden) return

  const result = await requestMetrics(key)
  if (!result) return
  if (result.ok) {
    failures = 0
    automaticRetriesPaused = false
    applyStripeMetrics(result.value)
    schedule(nextPollDelay())
    return
  }

  failures += 1
  const delay = retryDelay(result.error, failures)
  automaticRetriesPaused = delay === null
  const displayedError =
    result.error.kind === "rate_limited" && delay !== null
      ? { ...result.error, retryAfterMs: delay }
      : result.error
  renderPaymentError(displayedError)
  updateRefreshText()
  if (delay !== null) schedule(delay)
}

export function resumePolling(): void {
  failures = 0
  automaticRetriesPaused = false
  schedule(nextPollDelay())
}

export function updateRefreshText(): void {
  const el = document.getElementById("refresh-text")
  if (!el) return
  if (getDataSource() === "demo") {
    el.textContent = "Demo data"
    return
  }

  const refreshedAt = getLastRefreshed()
  if (!refreshedAt) {
    el.textContent = "Connecting…"
    return
  }
  const secs = Math.max(0, Math.floor((Date.now() - refreshedAt.getTime()) / 1000))
  if (secs < 60) el.textContent = `Updated ${secs}s ago`
  else if (secs < 3600) el.textContent = `Updated ${Math.floor(secs / 60)}m ago`
  else el.textContent = `Updated ${Math.floor(secs / 3600)}h ago`
}

export function initRefresh(): void {
  setInterval(updateRefreshText, 30_000)
  updateRefreshText()

  bannerAction?.addEventListener("click", () => {
    if (bannerAction.dataset.action === "open_settings") {
      document.getElementById("settings-btn")?.click()
    } else {
      void refreshNow()
    }
  })
  window.addEventListener("online", () => {
    if (!document.hidden && !automaticRetriesPaused) void refreshNow()
  })
  window.addEventListener("offline", () => {
    stopTimer()
    cancelActiveRequest()
    renderPaymentError({ kind: "offline", provider: "stripe", retryable: true })
  })
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopTimer()
    else if (navigator.onLine && !automaticRetriesPaused) {
      const refreshedAt = getLastRefreshed()
      const age = refreshedAt ? Date.now() - refreshedAt.getTime() : POLL_INTERVAL_MS
      if (age >= POLL_INTERVAL_MS) void refreshNow()
      else schedule(Math.max(POLL_INTERVAL_MS - age, nextPollDelay() - age))
    }
  })
  void refreshNow()
}

export { POLL_INTERVAL_MS }
