import { describe, expect, it } from "bun:test"
import { readStorage, removeStorage, writeStorage } from "./storage"

describe("safe storage", () => {
  it("reads, writes, and removes values", () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value),
    }
    expect(writeStorage("key", "value", storage)).toBe(true)
    expect(readStorage("key", storage)).toBe("value")
    expect(removeStorage("key", storage)).toBe(true)
    expect(readStorage("key", storage)).toBeNull()
  })

  it("degrades safely when local storage is unavailable", () => {
    const unavailable = {
      getItem: () => {
        throw new Error("unavailable")
      },
      removeItem: () => {
        throw new Error("unavailable")
      },
      setItem: () => {
        throw new Error("unavailable")
      },
    }
    expect(readStorage("key", unavailable)).toBeNull()
    expect(writeStorage("key", "value", unavailable)).toBe(false)
    expect(removeStorage("key", unavailable)).toBe(false)
  })
})
