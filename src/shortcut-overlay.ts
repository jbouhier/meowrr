export function shortcutOverlayAction(
  key: string,
  visible: boolean,
  inSettings: boolean,
  repeat = false,
  modified = false
): "show" | "hide" | null {
  if (repeat || modified) return null
  if (key === "Tab" && !inSettings) return visible ? "hide" : "show"
  if (key === "Escape" && visible) return "hide"
  return null
}
