// src/screens/PauseScreen.jsx

import { useEffect, useRef } from "react"
import { useScreenKeys, actionClass } from "../components/ScreenActions.jsx"

export default function PauseScreen({ onResume, onMenu }) {

    const panel = useRef()
    useScreenKeys({})
    useEffect(() => {

        const previous = document.activeElement

        panel.current?.querySelector("button")?.focus()
        return () => {
            if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
        }
    }, [])
    function trapFocus(event) {

        if (event.key !== "Tab") return

        const buttons = [...panel.current.querySelectorAll("button:not(:disabled)")]
        const first = buttons[0]
        const last = buttons.at(-1)

        if (
            event.shiftKey && document.activeElement === first
        ) {
            event.preventDefault(); last.focus()
        }
        else if (
            !event.shiftKey && document.activeElement === last
        ) {
            event.preventDefault(); first.focus()
        }
    }
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm font-mono">

            <section ref={panel}
                role="dialog"
                aria-modal="true"
                aria-labelledby="pause-title"
                onKeyDown={trapFocus}
                className="w-[min(90vw,420px)] border border-cyan-400/50 bg-slate-950 p-8 text-center">

                <h2 id="pause-title" className="text-2xl tracking-[0.3em] text-cyan-300">PAUSED</h2>
                <p className="my-5 text-xs text-white/50">Combat and effects suspended.</p>
                <div className="flex flex-col gap-3">
                    <button className={actionClass} onClick={onResume}>Resume</button>
                    <button className={actionClass} onClick={onMenu}>Main menu</button>
                </div>
                <p className="mt-5 text-xs text-white/40">P / ESC — RESUME</p>
            </section>

        </div>
    )
}
