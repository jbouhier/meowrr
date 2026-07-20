import "./style.css"
import "./types/tauri.d.ts"

import { initRanges } from "./ranges"
import { initSparkline, initAxisToggle } from "./sparkline"
import { initRefresh } from "./refresh"
import { initSettings } from "./settings"
import { initUpdates } from "./updates"
import { initWindow } from "./window"
import { initShortcuts } from "./shortcuts"
import { initTooltips } from "./tooltips"
import { initTabHint } from "./tab-hint"

;[
  initSparkline,
  initRanges,
  initAxisToggle,
  initRefresh,
  initSettings,
  initUpdates,
  initWindow,
  initShortcuts,
  initTooltips,
  initTabHint,
].forEach((init) => init())
