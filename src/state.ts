import type { RangeKey } from "./types"

let currentRange: RangeKey = (localStorage.getItem("meowrr_range") as RangeKey) || "M"
let showAxis = localStorage.getItem("meowrr_show_axis") === "true"
let alwaysOnTop = localStorage.getItem("meowrr_always_on_top") === "true"
let isMaximized = false
let lastRefreshed = new Date()
let dragAbort: AbortController | null = null

export const getCurrentRange = (): RangeKey => currentRange
export const setCurrentRange = (r: RangeKey): void => {
  currentRange = r
  localStorage.setItem("meowrr_range", r)
}

export const getShowAxis = (): boolean => showAxis
export const setShowAxis = (v: boolean): void => {
  showAxis = v
  localStorage.setItem("meowrr_show_axis", String(showAxis))
}

export const getAlwaysOnTop = (): boolean => alwaysOnTop
export const setAlwaysOnTopState = (v: boolean): void => {
  alwaysOnTop = v
  localStorage.setItem("meowrr_always_on_top", String(v))
}

export const getIsMaximized = (): boolean => isMaximized
export const setIsMaximized = (v: boolean): void => {
  isMaximized = v
}

export const getLastRefreshed = (): Date => lastRefreshed
export const setLastRefreshed = (d: Date): void => {
  lastRefreshed = d
}

export const getDragAbort = (): AbortController | null => dragAbort
export const setDragAbort = (c: AbortController | null): void => {
  dragAbort = c
}
