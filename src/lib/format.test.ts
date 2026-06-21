import { describe, expect, it } from "bun:test";
import { fmt } from "./format";

describe("fmt", () => {
  it("formats whole thousands without decimals", () => {
    expect(fmt(42000)).toBe("42k");
    expect(fmt(42000, true)).toBe("$42k");
  });

  it("formats fractional thousands with one decimal", () => {
    expect(fmt(1250)).toBe("1.3k");
    expect(fmt(1250, true)).toBe("$1.3k");
  });

  it("formats millions with one decimal", () => {
    expect(fmt(1500000)).toBe("1.5M");
    expect(fmt(1500000, true)).toBe("$1.5M");
  });

  it("returns small numbers as-is", () => {
    expect(fmt(0)).toBe("0");
    expect(fmt(999)).toBe("999");
    expect(fmt(999, true)).toBe("$999");
  });

  it("handles the boundary at 1000", () => {
    expect(fmt(1000)).toBe("1k");
    expect(fmt(1000, true)).toBe("$1k");
  });

  it("rounds consistently near boundaries", () => {
    expect(fmt(999.9)).toBe("999.9"); // < 1000
    expect(fmt(1001)).toBe("1k"); // rounds to 1.0, trimmed to 1k
  });
});
