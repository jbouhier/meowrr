export function axisXIndices(len: number): number[] {
  if (len <= 5) return Array.from({ length: len }, (_, i) => i);
  const set = new Set([0]);
  for (let i = 1; i < 4; i++) set.add(Math.round((i * (len - 1)) / 4));
  set.add(len - 1);
  return [...set];
}

export function buildPath(pts: ReadonlyArray<readonly [number, number]>, tension = 0.4): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0][0]},${pts[0][1]}`;

  const d = [`M ${pts[0][0]},${pts[0][1]}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const c1x = p1[0] + (p2[0] - p0[0]) * tension;
    const c1y = p1[1] + (p2[1] - p0[1]) * tension;
    const c2x = p2[0] - (p3[0] - p1[0]) * tension;
    const c2y = p2[1] - (p3[1] - p1[1]) * tension;
    d.push(
      `C ${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`
    );
  }
  return d.join(" ");
}

export function projectSparklinePoints(
  data: number[],
  W: number,
  H: number,
  xPad: number,
  yTop: number,
  yBot: number
): [number, number][] {
  if (data.length === 0) return [];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const usableWidth = W - xPad * 2;

  return data.map((v, i) => [
    data.length === 1 ? W / 2 : xPad + (i / (data.length - 1)) * usableWidth,
    H - yBot - ((v - min) / range) * (H - yTop - yBot),
  ]);
}
