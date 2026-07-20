import { describe, expect, it } from "bun:test"
import { shortcutOverlayAction } from "./shortcut-overlay"

describe("shortcutOverlayAction", () => {
  it("toggles the shortcut overlay with Tab", () => {
    expect(shortcutOverlayAction("Tab", false, false)).toBe("show")
    expect(shortcutOverlayAction("Tab", true, false)).toBe("hide")
  })

  it("closes the shortcut overlay with Escape", () => {
    expect(shortcutOverlayAction("Escape", true, false)).toBe("hide")
    expect(shortcutOverlayAction("Escape", false, false)).toBeNull()
  })

  it("leaves Tab navigation alone in Settings and ignores repeats or modifiers", () => {
    expect(shortcutOverlayAction("Tab", false, true)).toBeNull()
    expect(shortcutOverlayAction("Tab", false, false, true)).toBeNull()
    expect(shortcutOverlayAction("Tab", false, false, false, true)).toBeNull()
  })
})
