export function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
}

function cancelAnimations(elements: HTMLElement[]): void {
  elements.forEach((element) => {
    element.getAnimations().forEach((animation) => {
      animation.cancel()
    })
  })
}

export function animateStats(updateFn: () => void): void {
  const els = ["mrr", "change", "change-short"]
    .map((id) => document.getElementById(id))
    .filter(Boolean) as HTMLElement[]
  if (els.length === 0) return
  cancelAnimations(els)
  if (prefersReducedMotion()) {
    updateFn()
    return
  }

  const fadeOut = els[0].animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: 120,
    easing: "ease-in",
  })
  els.slice(1).forEach((el) => {
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: "ease-in" })
  })
  fadeOut.addEventListener("finish", () => {
    updateFn()
    els.forEach((el) => {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" })
    })
  })
}

export function fadeTransition(outEl: HTMLElement, inEl: HTMLElement, onSwap?: () => void): void {
  cancelAnimations([outEl, inEl])
  if (prefersReducedMotion()) {
    outEl.classList.add("hidden")
    inEl.classList.remove("hidden")
    onSwap?.()
    return
  }
  outEl
    .animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: "ease-in" })
    .addEventListener("finish", () => {
      outEl.classList.add("hidden")
      inEl.classList.remove("hidden")
      onSwap?.()
      inEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" })
    })
}
