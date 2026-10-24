// src/components/ScreenActions.jsx

import { useEffect, useRef } from "react"

export function isInteractive(target) {
  return target
    instanceof Element && !!target.closest("button,a,input,select,textarea,[contenteditable]")
}
// Native Tab, Enter, Space and arrow-key behaviour is retained on controls.
export function useScreenKeys(actions) {

  const latest = useRef(actions)
  latest.current = actions

  useEffect(() => {
    function onKey(event) {
      if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey)
        return
      const action = latest.current[event.key.toLowerCase()]
      if (!action)
        return
      if (isInteractive(event.target) && !["Escape", "Backspace"].includes(event.key))
        return
      if (event.target instanceof Element && event.target.closest("input,select,textarea,[contenteditable]"))
        return

      event.preventDefault()
      action()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
}

export const actionClass = "cursor-pointer border border-cyan-400/50 bg-black/60 px-5 py-3 text-xs uppercase tracking-[0.2em] text-cyan-200 transition hover:bg-cyan-400/10 focus-visible:outline-2 focus-visible:outline-cyan-200 disabled:cursor-not-allowed disabled:opacity-30"

export function ScreenActions({ items }) {

  return (
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      {items.filter(Boolean).map(item =>
        <button key={item.label} type="button" className={actionClass} disabled={item.disabled} onClick={item.action}>{item.label}</button>
      )}
    </div>
  )
}
