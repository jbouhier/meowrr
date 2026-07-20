export const STORAGE_KEYS = {
  alwaysOnTop: "meowrr_always_on_top",
  apiKey: "meowrr_api_key",
  range: "meowrr_range",
  showAxis: "meowrr_show_axis",
  tabHintDev: "meowrr_tab_hint_dev",
  tabHintShown: "meowrr_tab_hint_shown",
} as const

export function readStorage(
  key: string,
  storage: Pick<Storage, "getItem"> = localStorage
): string | null {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(
  key: string,
  value: string,
  storage: Pick<Storage, "setItem"> = localStorage
): boolean {
  try {
    storage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function removeStorage(
  key: string,
  storage: Pick<Storage, "removeItem"> = localStorage
): boolean {
  try {
    storage.removeItem(key)
    return true
  } catch {
    return false
  }
}
