import { relaunch } from "@tauri-apps/plugin-process"
import { check } from "@tauri-apps/plugin-updater"

const updateBanner = document.getElementById("update-banner")
const updateVersion = document.getElementById("update-version")
const updateBtn = document.getElementById("update-btn") as HTMLButtonElement | null

async function checkForUpdates(): Promise<void> {
  try {
    const update = await check()
    if (!update?.available) return
    if (updateVersion) updateVersion.textContent = update.version
    updateBanner?.classList.remove("hidden")
  } catch {
    // offline / endpoint unreachable — fail silently
  }
}

export function initUpdates(): void {
  if (updateBtn) {
    updateBtn.addEventListener("click", async () => {
      updateBtn.disabled = true
      updateBtn.textContent = "Installing…"
      try {
        const update = await check()
        if (update?.available) {
          await update.downloadAndInstall()
          await relaunch()
        } else {
          updateBanner?.classList.add("hidden")
        }
      } catch {
        updateBtn.disabled = false
        updateBtn.textContent = "Update & restart"
      }
    })
  }

  setTimeout(checkForUpdates, 3000)
}
