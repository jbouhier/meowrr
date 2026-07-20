import { describe, expect, it } from "bun:test"
import {
  MAX_BACKOFF_MS,
  nextPollDelay,
  POLL_INTERVAL_MS,
  POLL_JITTER_RATIO,
  retryDelay,
} from "./polling"

describe("nextPollDelay", () => {
  it("adds bounded jitter around the one-minute interval", () => {
    expect(nextPollDelay(() => 0)).toBe(POLL_INTERVAL_MS * (1 - POLL_JITTER_RATIO))
    expect(nextPollDelay(() => 0.5)).toBe(POLL_INTERVAL_MS)
    expect(nextPollDelay(() => 1)).toBe(POLL_INTERVAL_MS * (1 + POLL_JITTER_RATIO))
  })

  it("clamps an invalid random source", () => {
    expect(nextPollDelay(() => -1)).toBe(POLL_INTERVAL_MS * (1 - POLL_JITTER_RATIO))
    expect(nextPollDelay(() => 2)).toBe(POLL_INTERVAL_MS * (1 + POLL_JITTER_RATIO))
  })
})

describe("retryDelay", () => {
  it("does not retry failures that require user action", () => {
    expect(
      retryDelay({ kind: "invalid_credentials", provider: "stripe", retryable: false }, 1)
    ).toBeNull()
  })

  it("backs off retryable failures and caps the delay", () => {
    const error = { kind: "provider_unavailable", provider: "stripe", retryable: true } as const
    expect(retryDelay(error, 1)).toBe(POLL_INTERVAL_MS)
    expect(retryDelay(error, 2)).toBe(POLL_INTERVAL_MS * 2)
    expect(retryDelay(error, 20)).toBe(MAX_BACKOFF_MS)
  })

  it("honors bounded provider retry instructions", () => {
    const error = {
      kind: "rate_limited",
      provider: "stripe",
      retryable: true,
      retryAfterMs: 60 * 60_000,
    } as const
    expect(retryDelay(error, 1)).toBe(MAX_BACKOFF_MS)
  })
})
