import { axisXIndices, buildPath, projectSparklinePoints } from "./lib/chart"
import { fmt } from "./lib/format"
import { RANGES } from "./ranges"
import { getCurrentRange, getShowAxis, setShowAxis } from "./state"

const svg = document.getElementById("sparkline") as SVGSVGElement | null
const chartWrap = svg?.parentElement

export function drawSparkline(data: number[], xLabels: string[] | null, animate = false): void {
  if (!chartWrap) return
  const { width: W, height: H } = chartWrap.getBoundingClientRect()
  if (W < 1 || H < 1) return

  const showAxis = getShowAxis()
  const stroke = Math.min(Math.max(3, W * 0.013), 8)
  const dotR = Math.min(Math.max(2, W * 0.007), 5)
  const xPad = Math.min(Math.max(12, W * 0.04), 28) // matches stats left/right padding
  const yTop = Math.max(dotR * 3.5 + 2, Math.min(Math.max(8, stroke * 1.5), 14))
  const yBot = showAxis
    ? Math.min(Math.max(22, H * 0.15), 36)
    : Math.min(Math.max(8, stroke * 1.5), 14)

  const pts = projectSparklinePoints(data, W, H, xPad, yTop, yBot)
  const line = buildPath(pts)
  const last = pts[pts.length - 1]

  const sparkLine = document.getElementById("spark-line")
  const sparkFill = document.getElementById("spark-fill")
  const sparkDot = document.getElementById("spark-dot")
  const sparkGlow = document.getElementById("spark-glow")
  if (!sparkLine || !sparkFill || !sparkDot || !sparkGlow) return

  sparkLine.setAttribute("d", line)
  sparkLine.setAttribute("stroke-width", String(stroke))
  sparkFill.setAttribute("d", `${line} L ${W},${H} L ${xPad},${H} Z`)

  sparkDot.setAttribute("cx", String(last[0]))
  sparkDot.setAttribute("cy", String(last[1]))
  sparkDot.setAttribute("r", String(dotR))
  sparkGlow.setAttribute("cx", String(last[0]))
  sparkGlow.setAttribute("cy", String(last[1]))
  sparkGlow.setAttribute("r", String(dotR * 3.5))

  const axisGroup = document.getElementById("axis-group")
  if (axisGroup) {
    axisGroup.innerHTML = ""
    if (showAxis) drawAxis(axisGroup, pts, data, W, H, xPad, yTop, yBot, xLabels)
  }

  if (animate) animateSparkline()
}

function animateSparkline(): void {
  const line = document.getElementById("spark-line") as SVGPathElement | null
  const fill = document.getElementById("spark-fill") as SVGPathElement | null
  const dot = document.getElementById("spark-dot") as SVGCircleElement | null
  const glow = document.getElementById("spark-glow") as SVGCircleElement | null
  if (!line || !fill || !dot || !glow) return

  const length = line.getTotalLength()
  line.style.strokeDasharray = String(length)
  line.style.strokeDashoffset = String(length)
  line
    .animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], {
      duration: 600,
      easing: "ease-in-out",
    })
    .addEventListener("finish", () => {
      line.style.strokeDasharray = ""
      line.style.strokeDashoffset = ""
    })

  fill.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, easing: "ease-out" })

  ;[dot, glow].forEach((el) =>
    el.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 250,
      delay: 450,
      easing: "ease-out",
      fill: "backwards",
    })
  )
}

function drawAxis(
  g: HTMLElement,
  pts: [number, number][],
  data: number[],
  W: number,
  H: number,
  xLeft: number,
  yTop: number,
  yBot: number,
  xLabels: string[] | null
): void {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const fontSize = Math.max(9, Math.min(W * 0.028, 14))
  const color = "#44445a"

  function text(x: number, y: number, content: string, anchor = "middle"): SVGTextElement {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "text")
    el.setAttribute("x", String(x))
    el.setAttribute("y", String(y))
    el.setAttribute("font-size", String(fontSize))
    el.setAttribute("fill", color)
    el.setAttribute("text-anchor", anchor)
    el.setAttribute("dominant-baseline", "middle")
    el.setAttribute("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif")
    el.textContent = content
    return el
  }

  if (xLabels) {
    const xLabelY = H - yBot * 0.4
    axisXIndices(pts.length).forEach((i) => {
      if (i < xLabels.length) {
        const x = Math.min(pts[i][0], W - fontSize * 1.5)
        g.appendChild(text(x, xLabelY, xLabels[i]))
      }
    })
  }

  const labelX = xLeft + 5
  g.appendChild(text(labelX, yTop + fontSize * 0.6, fmt(max, true), "start"))
  g.appendChild(text(labelX, H - yBot - fontSize * 0.6, fmt(min, true), "start"))
}

export function initSparkline(): void {
  if (chartWrap) {
    new ResizeObserver(() => {
      const d = RANGES[getCurrentRange()]
      drawSparkline(d.data, d.xLabels)
    }).observe(chartWrap)
  }
}

export function initAxisToggle(): void {
  const axisToggle = document.getElementById("axis-toggle")
  if (!axisToggle) return
  axisToggle.setAttribute("aria-checked", String(getShowAxis()))
  axisToggle.addEventListener("click", () => {
    setShowAxis(!getShowAxis())
    axisToggle.setAttribute("aria-checked", String(getShowAxis()))
    const d = RANGES[getCurrentRange()]
    drawSparkline(d.data, d.xLabels)
  })
}
