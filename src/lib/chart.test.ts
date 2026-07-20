import { describe, expect, it } from "bun:test"
import { axisXIndices, buildPath, projectSparklinePoints } from "./chart"

describe("axisXIndices", () => {
  it("returns all indices for 5 or fewer points", () => {
    expect(axisXIndices(1)).toEqual([0])
    expect(axisXIndices(3)).toEqual([0, 1, 2])
    expect(axisXIndices(5)).toEqual([0, 1, 2, 3, 4])
  })

  it("returns first, last, and three rounded interior indices for longer series", () => {
    expect(axisXIndices(12)).toEqual([0, 3, 6, 8, 11])
    expect(axisXIndices(13)).toEqual([0, 3, 6, 9, 12])
  })

  it("handles a 6-point series", () => {
    expect(axisXIndices(6)).toEqual([0, 1, 3, 4, 5])
  })

  it("reduces labels for narrow plots while keeping both endpoints", () => {
    expect(axisXIndices(12, 3)).toEqual([0, 6, 11])
    expect(axisXIndices(4, 3)).toEqual([0, 2, 3])
  })
})

describe("buildPath", () => {
  it("returns empty string for no points", () => {
    expect(buildPath([])).toBe("")
  })

  it("returns a move command for a single point", () => {
    expect(buildPath([[10, 20]] as const)).toBe("M 10,20")
  })

  it("builds a catmull-rom-style cubic bezier for multiple points", () => {
    const pts = [
      [0, 100],
      [50, 50],
      [100, 0],
    ] as const
    const path = buildPath(pts)
    expect(path.startsWith("M 0,100")).toBe(true)
    expect(path.includes("C")).toBe(true)
    expect(path.endsWith("100.00,0.00")).toBe(true)
  })

  it("uses default tension of 0.4", () => {
    const pts = [
      [0, 0],
      [10, 10],
      [20, 0],
    ] as const
    const defaultPath = buildPath(pts)
    const explicitPath = buildPath(pts, 0.4)
    expect(defaultPath).toBe(explicitPath)
  })

  it("changes shape with different tension", () => {
    const pts = [
      [0, 0],
      [10, 10],
      [20, 0],
    ] as const
    const loose = buildPath(pts, 0.1)
    const tight = buildPath(pts, 0.8)
    expect(loose).not.toBe(tight)
  })
})

describe("projectSparklinePoints", () => {
  const W = 100
  const H = 100
  const pad = 10
  const yTop = 10
  const yBot = 10

  it("projects points across the full width", () => {
    const pts = projectSparklinePoints([0, 50, 100], W, H, pad, yTop, yBot)
    expect(pts[0][0]).toBeCloseTo(pad)
    expect(pts[2][0]).toBeCloseTo(W - pad)
  })

  it("supports a wider left gutter for value labels", () => {
    const pts = projectSparklinePoints([0, 100], W, H, 30, yTop, yBot, 10)
    expect(pts[0][0]).toBeCloseTo(30)
    expect(pts[1][0]).toBeCloseTo(90)
  })

  it("maps min value to the bottom padding and max to the top padding", () => {
    const pts = projectSparklinePoints([0, 50, 100], W, H, pad, yTop, yBot)
    expect(pts[0][1]).toBeCloseTo(H - yBot)
    expect(pts[2][1]).toBeCloseTo(yTop)
  })

  it("avoids division by zero for flat data", () => {
    const pts = projectSparklinePoints([42, 42, 42], W, H, pad, yTop, yBot)
    expect(pts.every((p) => p[1] === H - yBot)).toBe(true)
  })

  it("returns empty array for empty data", () => {
    expect(projectSparklinePoints([], W, H, pad, yTop, yBot)).toEqual([])
  })

  it("centers a single data point horizontally", () => {
    const pts = projectSparklinePoints([42], W, H, pad, yTop, yBot)
    expect(pts.length).toBe(1)
    expect(pts[0][0]).toBeCloseTo(W / 2)
  })

  it("handles descending data", () => {
    const pts = projectSparklinePoints([100, 50, 0], W, H, pad, yTop, yBot)
    expect(pts[0][1]).toBeCloseTo(yTop)
    expect(pts[2][1]).toBeCloseTo(H - yBot)
  })
})
