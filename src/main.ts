import { axisXIndices, buildPath, projectSparklinePoints } from "./lib/chart";
import { fmt } from "./lib/format";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { validateStripeKey } from "./lib/stripe";
import type { MetricRange, RangeKey } from "./types";
import "./style.css";
import "./types/tauri.d.ts";

// ── Data ───────────────────────────────────────────────────────────────────

const RANGES: Record<RangeKey, MetricRange> = {
  M: {
    label: "MRR",
    data: [22000, 24500, 26800, 28900, 30500, 32800, 35100, 37200, 38900, 40100, 41200, 42000],
    xLabels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    metric: 42000,
    change: 4269,
    pct: 11.3,
    suffix: "this month",
  },
  Y: {
    label: "ARR",
    data: [14400, 84000, 276000, 504000],
    xLabels: ["2022", "2023", "2024", "2025"],
    metric: 504000,
    change: 228000,
    pct: 82.6,
    suffix: "YoY",
  },
  A: {
    label: "MRR",
    data: [400, 1200, 2800, 5400, 9200, 14000, 20000, 28000, 35000, 38900, 40100, 42000],
    xLabels: null,
    metric: 42000,
    change: 41600,
    pct: null,
    suffix: "all time",
  },
};

// ── Range ──────────────────────────────────────────────────────────────────

let currentRange: RangeKey = (localStorage.getItem("meowrr_range") as RangeKey) || "M";

function setRange(r: RangeKey): void {
  document.querySelectorAll(".range-pill").forEach((b) => {
    b.classList.toggle("active", b.getAttribute("data-range") === r);
  });
  if (r === currentRange) return;
  currentRange = r;
  localStorage.setItem("meowrr_range", r);
  const d = RANGES[r];

  animateStats(() => {
    const mrrEl = document.getElementById("mrr");
    const changeEl = document.getElementById("change");
    const changeShortEl = document.getElementById("change-short");
    if (!mrrEl || !changeEl || !changeShortEl) return;

    mrrEl.textContent = fmt(d.metric, true);
    const delta = d.pct !== null ? `+${d.pct}%` : `+${fmt(d.change, true)}`;
    changeEl.textContent = `${d.label} · ${delta} ${d.suffix}`;
    changeShortEl.textContent = `${d.label} · ${delta}`;
  });

  drawSparkline(d.data, d.xLabels, true);
}

document.querySelectorAll(".range-pill").forEach((btn) => {
  btn.addEventListener("click", () => {
    const range = btn.getAttribute("data-range") as RangeKey;
    if (range) setRange(range);
  });
});

// ── Sparkline ──────────────────────────────────────────────────────────────

let showAxis = localStorage.getItem("meowrr_show_axis") === "true";

const svg = document.getElementById("sparkline") as SVGSVGElement | null;
const chartWrap = svg?.parentElement;

function drawSparkline(data: number[], xLabels: string[] | null, animate = false): void {
  if (!chartWrap) return;
  const { width: W, height: H } = chartWrap.getBoundingClientRect();
  if (W < 1 || H < 1) return;

  const stroke = Math.min(Math.max(3, W * 0.013), 8);
  const dotR = Math.min(Math.max(2, W * 0.007), 5);
  const xPad = Math.min(Math.max(12, W * 0.04), 28); // matches stats left/right padding
  const yTop = Math.max(dotR * 3.5 + 2, Math.min(Math.max(8, stroke * 1.5), 14));
  const yBot = showAxis
    ? Math.min(Math.max(22, H * 0.15), 36)
    : Math.min(Math.max(8, stroke * 1.5), 14);

  const pts = projectSparklinePoints(data, W, H, xPad, yTop, yBot);
  const line = buildPath(pts);
  const last = pts[pts.length - 1];

  const sparkLine = document.getElementById("spark-line");
  const sparkFill = document.getElementById("spark-fill");
  const sparkDot = document.getElementById("spark-dot");
  const sparkGlow = document.getElementById("spark-glow");
  if (!sparkLine || !sparkFill || !sparkDot || !sparkGlow) return;

  sparkLine.setAttribute("d", line);
  sparkLine.setAttribute("stroke-width", String(stroke));
  sparkFill.setAttribute("d", `${line} L ${W},${H} L ${xPad},${H} Z`);

  sparkDot.setAttribute("cx", String(last[0]));
  sparkDot.setAttribute("cy", String(last[1]));
  sparkDot.setAttribute("r", String(dotR));
  sparkGlow.setAttribute("cx", String(last[0]));
  sparkGlow.setAttribute("cy", String(last[1]));
  sparkGlow.setAttribute("r", String(dotR * 3.5));

  const axisGroup = document.getElementById("axis-group");
  if (axisGroup) {
    axisGroup.innerHTML = "";
    if (showAxis) drawAxis(axisGroup, pts, data, W, H, xPad, yTop, yBot, xLabels);
  }

  if (animate) animateSparkline();
}

function animateSparkline(): void {
  const line = document.getElementById("spark-line") as SVGPathElement | null;
  const fill = document.getElementById("spark-fill") as SVGPathElement | null;
  const dot = document.getElementById("spark-dot") as SVGCircleElement | null;
  const glow = document.getElementById("spark-glow") as SVGCircleElement | null;
  if (!line || !fill || !dot || !glow) return;

  const length = line.getTotalLength();
  line.style.strokeDasharray = String(length);
  line.style.strokeDashoffset = String(length);
  line
    .animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], {
      duration: 600,
      easing: "ease-in-out",
    })
    .addEventListener("finish", () => {
      line.style.strokeDasharray = "";
      line.style.strokeDashoffset = "";
    });

  fill.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, easing: "ease-out" });

  [dot, glow].forEach((el) =>
    el.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 250,
      delay: 450,
      easing: "ease-out",
      fill: "backwards",
    })
  );
}

function animateStats(updateFn: () => void): void {
  const els = ["mrr", "change", "change-short"]
    .map((id) => document.getElementById(id))
    .filter(Boolean) as HTMLElement[];
  if (els.length === 0) return;

  const fadeOut = els[0].animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: 120,
    easing: "ease-in",
  });
  els
    .slice(1)
    .forEach((el) =>
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: "ease-in" })
    );
  fadeOut.addEventListener("finish", () => {
    updateFn();
    els.forEach((el) =>
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" })
    );
  });
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
  const min = Math.min(...data);
  const max = Math.max(...data);
  const fontSize = Math.max(9, Math.min(W * 0.028, 14));
  const color = "#44445a";

  function text(x: number, y: number, content: string, anchor = "middle"): SVGTextElement {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "text");
    el.setAttribute("x", String(x));
    el.setAttribute("y", String(y));
    el.setAttribute("font-size", String(fontSize));
    el.setAttribute("fill", color);
    el.setAttribute("text-anchor", anchor);
    el.setAttribute("dominant-baseline", "middle");
    el.setAttribute("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif");
    el.textContent = content;
    return el;
  }

  if (xLabels) {
    const xLabelY = H - yBot * 0.4;
    axisXIndices(pts.length).forEach((i) => {
      if (i < xLabels.length) {
        const x = Math.min(pts[i][0], W - fontSize * 1.5);
        g.appendChild(text(x, xLabelY, xLabels[i]));
      }
    });
  }

  const labelX = xLeft + 5;
  g.appendChild(text(labelX, yTop + fontSize * 0.6, fmt(max, true), "start"));
  g.appendChild(text(labelX, H - yBot - fontSize * 0.6, fmt(min, true), "start"));
}

if (chartWrap) {
  new ResizeObserver(() => {
    const d = RANGES[currentRange];
    drawSparkline(d.data, d.xLabels);
  }).observe(chartWrap);
}

setRange(currentRange);

// ── Refresh timestamp ──────────────────────────────────────────────────────

let lastRefreshed = new Date();

function updateRefreshText(): void {
  const secs = Math.floor((Date.now() - lastRefreshed.getTime()) / 1000);
  const el = document.getElementById("refresh-text");
  if (!el) return;
  if (secs < 60) el.textContent = `Updated ${secs}s ago`;
  else if (secs < 3600) el.textContent = `Updated ${Math.floor(secs / 60)}m ago`;
  else el.textContent = `Updated ${Math.floor(secs / 3600)}h ago`;
}

setInterval(updateRefreshText, 30000);
updateRefreshText();

// ── Update check ────────────────────────────────────────────────────────────

const updateBanner = document.getElementById("update-banner");
const updateVersion = document.getElementById("update-version");
const updateBtn = document.getElementById("update-btn") as HTMLButtonElement | null;

async function checkForUpdates(): Promise<void> {
  try {
    const update = await check();
    if (!update?.available) return;
    if (updateVersion) updateVersion.textContent = update.version;
    updateBanner?.classList.remove("hidden");
  } catch {
    // offline / endpoint unreachable — fail silently
  }
}

if (updateBtn) {
  updateBtn.addEventListener("click", async () => {
    updateBtn.disabled = true;
    updateBtn.textContent = "Installing…";
    try {
      const update = await check();
      if (update?.available) {
        await update.downloadAndInstall();
        await relaunch();
      } else {
        updateBanner?.classList.add("hidden");
      }
    } catch {
      updateBtn.disabled = false;
      updateBtn.textContent = "Update & restart";
    }
  });
}

setTimeout(checkForUpdates, 3000);

// ── Error state ────────────────────────────────────────────────────────────

async function checkStripe(): Promise<void> {
  const key = await window.__TAURI__.core
    .invoke<string | null>("load_api_key")
    .catch(() => null);
  if (!key) return; // no key → demo data, no error
  const banner = document.getElementById("error-banner");
  if (!banner) return;

  const result = await validateStripeKey(fetch, key);
  banner.classList.toggle("hidden", result.ok);
  if (result.ok) {
    lastRefreshed = new Date();
    updateRefreshText();
  }
}

checkStripe();

// ── Copy MRR ───────────────────────────────────────────────────────────────

function copyMRR(): void {
  const text = document.getElementById("mrr")?.textContent;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const toast = document.getElementById("copy-toast");
    if (!toast) return;
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 2200);
  });
}

// ── Settings persistence ───────────────────────────────────────────────────

async function loadSettings(): Promise<void> {
  const saved = await window.__TAURI__.core
    .invoke<string | null>("load_api_key")
    .catch(() => null);
  const input = document.getElementById("api-key") as HTMLInputElement | null;
  if (saved && input) input.value = saved;
}

async function saveSettings(): Promise<void> {
  const input = document.getElementById("api-key") as HTMLInputElement | null;
  const key = input?.value.trim() ?? "";
  if (key)
    await window.__TAURI__.core.invoke("save_api_key", { value: key }).catch(() => {});
  else await window.__TAURI__.core.invoke("clear_api_key").catch(() => {});
  checkStripe();
}

// ── Views ──────────────────────────────────────────────────────────────────

const widgetView = document.getElementById("widget-view");
const settingsView = document.getElementById("settings-view");

function fadeTransition(outEl: HTMLElement, inEl: HTMLElement, onSwap?: () => void): void {
  outEl
    .animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: "ease-in" })
    .addEventListener("finish", () => {
      outEl.classList.add("hidden");
      onSwap?.();
      inEl.classList.remove("hidden");
      inEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" });
    });
}

function openSettings(): void {
  if (!widgetView || !settingsView) return;
  fadeTransition(widgetView, settingsView, loadSettings);
}

function closeSettings(): void {
  if (!settingsView || !widgetView) return;
  fadeTransition(settingsView, widgetView, saveSettings);
}

const settingsBtn = document.getElementById("settings-btn");
const backBtn = document.getElementById("back-btn");
const saveBtn = document.getElementById("save-btn");
if (settingsBtn) settingsBtn.addEventListener("click", openSettings);
if (backBtn) backBtn.addEventListener("click", closeSettings);
if (saveBtn) saveBtn.addEventListener("click", closeSettings);

// ── Axis toggle ────────────────────────────────────────────────────────────

const axisToggle = document.getElementById("axis-toggle");
if (axisToggle) {
  axisToggle.setAttribute("aria-checked", String(showAxis));
  axisToggle.addEventListener("click", () => {
    showAxis = !showAxis;
    localStorage.setItem("meowrr_show_axis", String(showAxis));
    axisToggle.setAttribute("aria-checked", String(showAxis));
    const d = RANGES[currentRange];
    drawSparkline(d.data, d.xLabels);
  });
}

// ── Always on top ──────────────────────────────────────────────────────────

let alwaysOnTop = localStorage.getItem("meowrr_always_on_top") === "true";
const pinBtn = document.getElementById("pin-btn");

async function setAlwaysOnTop(value: boolean): Promise<void> {
  alwaysOnTop = value;
  await window.__TAURI__.core.invoke("set_always_on_top", { value });
  localStorage.setItem("meowrr_always_on_top", String(value));
  if (!pinBtn) return;
  pinBtn.classList.toggle("pinned", value);
  pinBtn.dataset.tip = value ? "Unpin [T]" : "Keep on top [T]";
}

if (alwaysOnTop) {
  window.__TAURI__.core.invoke("set_always_on_top", { value: true });
  if (pinBtn) {
    pinBtn.classList.add("pinned");
    pinBtn.dataset.tip = "Unpin [T]";
  }
}

if (pinBtn) pinBtn.addEventListener("click", () => setAlwaysOnTop(!alwaysOnTop));

// ── Maximize ───────────────────────────────────────────────────────────────

const ICON_MAXIMIZE = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
const ICON_RESTORE = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/></svg>`;

let isMaximized = false;
const maximizeBtn = document.getElementById("maximize-btn");

async function toggleMaximize(): Promise<void> {
  await window.__TAURI__.core.invoke("toggle_maximize");
  isMaximized = !isMaximized;
  if (!maximizeBtn || !widgetView) return;
  maximizeBtn.innerHTML = isMaximized ? ICON_RESTORE : ICON_MAXIMIZE;
  maximizeBtn.title = isMaximized ? "Restore" : "Maximize";
  widgetView.classList.toggle("maximized", isMaximized);
}

if (maximizeBtn) maximizeBtn.addEventListener("click", toggleMaximize);

// ── Keyboard shortcuts ─────────────────────────────────────────────────────

const shortcutsOverlay = document.getElementById("shortcuts-overlay");

document.addEventListener("keyup", (e) => {
  if (e.key === "Tab" && shortcutsOverlay) shortcutsOverlay.classList.remove("visible");
});

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return; // ignore modified keys
  const inSettings = settingsView ? !settingsView.classList.contains("hidden") : false;

  if (e.key === "Tab") {
    e.preventDefault();
    if (!inSettings && shortcutsOverlay) shortcutsOverlay.classList.add("visible");
    return;
  }

  if (e.key === "Escape") {
    if (inSettings) closeSettings();
    else if (isMaximized) toggleMaximize();
  } else if (!inSettings) {
    if (e.key === "m" || e.key === "M") setRange("M");
    else if (e.key === "y" || e.key === "Y") setRange("Y");
    else if (e.key === "a" || e.key === "A") setRange("A");
    else if (e.key === "ArrowRight") {
      const order: RangeKey[] = ["M", "Y", "A"];
      setRange(order[(order.indexOf(currentRange) + 1) % 3]);
    } else if (e.key === "ArrowLeft") {
      const order: RangeKey[] = ["M", "Y", "A"];
      setRange(order[(order.indexOf(currentRange) + 2) % 3]);
    } else if (e.key === "c" || e.key === "C") copyMRR();
    else if (e.key === "f" || e.key === "F") toggleMaximize();
    else if (e.key === "t" || e.key === "T") setAlwaysOnTop(!alwaysOnTop);
    else if (e.key === "x" || e.key === "X") axisToggle?.click();
    else if (e.key === "s" || e.key === "S") openSettings();
    else if (e.key === "q" || e.key === "Q") closeWindow();
  }
});

// ── Global drag ───────────────────────────────────────────────────────────

let dragAbort: AbortController | null = null;

document.addEventListener("mousedown", (e) => {
  if (
    e.button !== 0 ||
    (e.target instanceof Element && e.target.closest("button, input, [role='switch']"))
  )
    return;

  if (dragAbort) dragAbort.abort();
  dragAbort = new AbortController();
  const { signal } = dragAbort;

  const startX = e.clientX;
  const startY = e.clientY;

  document.addEventListener(
    "mousemove",
    (ev) => {
      if (Math.abs(ev.clientX - startX) > 3 || Math.abs(ev.clientY - startY) > 3) {
        window.__TAURI__.core.invoke("plugin:window|start_dragging");
        dragAbort?.abort();
      }
    },
    { signal }
  );

  document.addEventListener("mouseup", () => dragAbort?.abort(), { signal, once: true });
});

// ── Close ──────────────────────────────────────────────────────────────────

async function closeWindow(): Promise<void> {
  await window.__TAURI__.core.invoke("close_app");
}

const closeBtn = document.getElementById("close-btn");
if (closeBtn) closeBtn.addEventListener("click", closeWindow);

// ── Tooltips ───────────────────────────────────────────────────────────────

const tooltip = document.getElementById("tooltip");
let tipTimer: ReturnType<typeof setTimeout> | null = null;

function showTip(el: HTMLElement): void {
  const raw = el.dataset.tip;
  if (!tooltip || !raw) return;
  if (tipTimer) clearTimeout(tipTimer);
  tipTimer = setTimeout(() => {
    const bracketIdx = raw.indexOf("[");
    if (bracketIdx !== -1) {
      const label = raw.slice(0, bracketIdx).trim();
      const key = raw.slice(bracketIdx + 1, raw.indexOf("]")).trim();
      tooltip.innerHTML = `${label} <kbd>${key}</kbd>`;
    } else {
      tooltip.textContent = raw;
    }
    const r = el.getBoundingClientRect();
    tooltip.style.left = `${r.left + r.width / 2}px`;
    tooltip.style.transform = "translateX(-50%)";
    if (window.innerHeight - r.bottom < 50) {
      tooltip.style.top = "auto";
      tooltip.style.bottom = `${window.innerHeight - r.top + 6}px`;
    } else {
      tooltip.style.bottom = "auto";
      tooltip.style.top = `${r.bottom + 6}px`;
    }
    tooltip.classList.add("visible");
  }, 400);
}

function hideTip(): void {
  if (tipTimer) clearTimeout(tipTimer);
  tooltip?.classList.remove("visible");
}

document.querySelectorAll("[data-tip]").forEach((el) => {
  if (!(el instanceof HTMLElement)) return;
  el.addEventListener("mouseenter", () => showTip(el));
  el.addEventListener("mouseleave", hideTip);
});

// ── First-launch Tab hint ──────────────────────────────────────────────────

const tabHint = document.getElementById("tab-hint");
if (import.meta.env.DEV || localStorage.getItem("meowrr_tab_hint_dev")) {
  tabHint?.classList.add("show");
} else if (!localStorage.getItem("meowrr_tab_hint_shown")) {
  setTimeout(() => tabHint?.classList.add("show"), 800);
  setTimeout(() => {
    tabHint?.classList.remove("show");
    localStorage.setItem("meowrr_tab_hint_shown", "1");
  }, 4800);
}
