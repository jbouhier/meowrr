const tooltip = document.getElementById("tooltip")
let tipTimer: ReturnType<typeof setTimeout> | null = null

function showTip(el: HTMLElement): void {
  const raw = el.dataset.tip
  if (!tooltip || !raw) return
  if (tipTimer) clearTimeout(tipTimer)
  tipTimer = setTimeout(() => {
    const bracketIdx = raw.indexOf("[")
    if (bracketIdx !== -1) {
      const label = raw.slice(0, bracketIdx).trim()
      const key = raw.slice(bracketIdx + 1, raw.indexOf("]")).trim()
      tooltip.replaceChildren(document.createTextNode(`${label} `))
      const keyboardKey = document.createElement("kbd")
      keyboardKey.textContent = key
      tooltip.appendChild(keyboardKey)
    } else {
      tooltip.textContent = raw
    }
    const r = el.getBoundingClientRect()
    tooltip.style.left = `${r.left + r.width / 2}px`
    tooltip.style.transform = "translateX(-50%)"
    if (window.innerHeight - r.bottom < 50) {
      tooltip.style.top = "auto"
      tooltip.style.bottom = `${window.innerHeight - r.top + 6}px`
    } else {
      tooltip.style.bottom = "auto"
      tooltip.style.top = `${r.bottom + 6}px`
    }
    tooltip.classList.add("visible")
  }, 400)
}

function hideTip(): void {
  if (tipTimer) clearTimeout(tipTimer)
  tooltip?.classList.remove("visible")
}

export function initTooltips(): void {
  document.querySelectorAll("[data-tip]").forEach((el) => {
    if (!(el instanceof HTMLElement)) return
    el.addEventListener("mouseenter", () => showTip(el))
    el.addEventListener("mouseleave", hideTip)
    el.addEventListener("focus", () => showTip(el))
    el.addEventListener("blur", hideTip)
  })
}
