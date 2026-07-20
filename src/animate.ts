export function animateStats(updateFn: () => void): void {
  const els = ["mrr", "change", "change-short"]
    .map((id) => document.getElementById(id))
    .filter(Boolean) as HTMLElement[]
  if (els.length === 0) return

  const fadeOut = els[0].animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: 120,
    easing: "ease-in",
  })
  els
    .slice(1)
    .forEach((el) =>
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: "ease-in" })
    )
  fadeOut.addEventListener("finish", () => {
    updateFn()
    els.forEach((el) =>
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" })
    )
  })
}

export function fadeTransition(outEl: HTMLElement, inEl: HTMLElement, onSwap?: () => void): void {
  outEl
    .animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: "ease-in" })
    .addEventListener("finish", () => {
      outEl.classList.add("hidden")
      onSwap?.()
      inEl.classList.remove("hidden")
      inEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" })
    })
}
