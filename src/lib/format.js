export function fmt(n, currency = false) {
  const p = currency ? "$" : "";
  if (n >= 1000000) return `${p}${parseFloat((n / 1000000).toFixed(1))}M`;
  if (n >= 1000) {
    const k = n / 1000;
    return `${p}${k % 1 === 0 ? k : parseFloat(k.toFixed(1))}k`;
  }
  return `${p}${n}`;
}
