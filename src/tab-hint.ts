export function initTabHint(): void {
  const tabHint = document.getElementById("tab-hint")
  if (import.meta.env.DEV || localStorage.getItem("meowrr_tab_hint_dev")) {
    tabHint?.classList.add("show")
  } else if (!localStorage.getItem("meowrr_tab_hint_shown")) {
    setTimeout(() => tabHint?.classList.add("show"), 800)
    setTimeout(() => {
      tabHint?.classList.remove("show")
      localStorage.setItem("meowrr_tab_hint_shown", "1")
    }, 4800)
  }
}
