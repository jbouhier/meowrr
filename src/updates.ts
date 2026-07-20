import { relaunch } from "@tauri-apps/plugin-process"
import { check } from "@tauri-apps/plugin-updater"

const updateBanner = document.getElementById("update-banner")
const updateVersion = document.getElementById("update-version")
const updateMessage = document.getElementById("update-message")
const updateBtn = document.getElementById("update-btn") as HTMLButtonElement | null

function showUpdateMessage(message: string): void {
  if (updateMessage) updateMessage.textContent = message
  updateBanner?.classList.remove("hidden")
}

async function checkForUpdates(): Promise<void> {
  try {
    const update = await check()
    if (!update?.available) return
    if (updateMessage && updateVersion) {
      updateMessage.replaceChildren("MeowRR ", updateVersion, " is here")
      updateVersion.textContent = update.version
    }
    updateBanner?.classList.remove("hidden")
  } catch {
    // offline / endpoint unreachable — fail silently
  }
}

export function initUpdates(): void {
  if (updateBtn) {
    updateBtn.addEventListener("click", async () => {
      updateBtn.disabled = true
      updateBtn.textContent = "Starting…"
      try {
        const update = await check()
        if (update?.available) {
          let downloaded = 0
          let total: number | undefined
          await update.downloadAndInstall((event) => {
            if (event.event === "Started") {
              total = event.data.contentLength
              showUpdateMessage("Downloading update…")
            } else if (event.event === "Progress") {
              downloaded += event.data.chunkLength
              if (total) {
                const percent = Math.min(100, Math.round((downloaded / total) * 100))
                showUpdateMessage(`Downloading update… ${percent}%`)
              }
            } else {
              showUpdateMessage("Installing update…")
            }
          })
          await relaunch()
        } else {
          updateBanner?.classList.add("hidden")
        }
      } catch {
        showUpdateMessage("Update paused. Check your connection and try again.")
      } finally {
        updateBtn.disabled = false
        updateBtn.textContent = "Retry update"
      }
    })
  }

  setTimeout(checkForUpdates, 3000)
}
