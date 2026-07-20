import { readStorage, STORAGE_KEYS, writeStorage } from "./storage"

export function initTabHint(): void {
  const tabHint = document.getElementById("tab-hint") as HTMLButtonElement | null
  const showTabHint = (): void => {
    tabHint?.classList.add("show")
    if (tabHint) tabHint.tabIndex = 0
    tabHint?.setAttribute("aria-hidden", "false")
  }

  if (import.meta.env.DEV || readStorage(STORAGE_KEYS.tabHintDev)) {
    showTabHint()
  } else if (!readStorage(STORAGE_KEYS.tabHintShown)) {
    setTimeout(showTabHint, 800)
  }
}

export function dismissTabHint(): void {
  const tabHint = document.getElementById("tab-hint") as HTMLButtonElement | null
  tabHint?.classList.remove("show")
  if (tabHint) tabHint.tabIndex = -1
  tabHint?.setAttribute("aria-hidden", "true")
  writeStorage(STORAGE_KEYS.tabHintShown, "1")
}
