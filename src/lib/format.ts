export function fmt(n: number, currency = false): string {
  const p = currency ? "$" : ""
  if (n >= 1_000_000) return `${p}${Number.parseFloat((n / 1_000_000).toFixed(1))}M`
  if (n >= 1000) {
    const k = n / 1000
    return `${p}${k % 1 === 0 ? k : Number.parseFloat(k.toFixed(1))}k`
  }
  return `${p}${n}`
}
