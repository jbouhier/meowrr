export function fmt(n: number, currency = false): string {
  const sign = n < 0 ? "−" : ""
  const prefix = currency ? "$" : ""
  const absolute = Math.abs(n)
  if (absolute >= 1_000_000) {
    return `${sign}${prefix}${Number.parseFloat((absolute / 1_000_000).toFixed(1))}M`
  }
  if (absolute >= 1000) {
    const thousands = absolute / 1000
    const compact = thousands % 1 === 0 ? thousands : Number.parseFloat(thousands.toFixed(1))
    return `${sign}${prefix}${compact}k`
  }
  return `${sign}${prefix}${absolute}`
}
