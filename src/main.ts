import "./style.css"

import { initRanges } from "./ranges"
import { initRefresh } from "./refresh"
import { initSettings } from "./settings"
import { initShortcuts } from "./shortcuts"
import { initAxisToggle, initSparkline } from "./sparkline"
import { initTabHint } from "./tab-hint"
import { initTooltips } from "./tooltips"
import { initUpdates } from "./updates"
import { initWindow } from "./window"

initSparkline()
initRanges()
initAxisToggle()
initRefresh()
initSettings()
initUpdates()
initWindow()
initShortcuts()
initTooltips()
initTabHint()
