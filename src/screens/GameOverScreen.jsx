// src/screens/GameOverScreen.jsx

import { useEffect } from "react"
import { simState } from "../state/simState.js"
import FlightLayout2 from "../components/FlightLayout2.jsx"

export function GameOverScreen({ onRestart, onMenu }) {

    // ========================================================
    // STATE
    // ========================================================

    const score = simState.score ?? 0

    // ========================================================
    // KEYBOARD
    // ========================================================

    useEffect(() => {

        const onKey = (event) => {

            if (event.key === "Enter") {
                event.preventDefault()
                onRestart?.()
            }

            if (event.key === "Escape" || event.key === "Backspace") {
                event.preventDefault()
                onMenu?.()
            }
        }

        window.addEventListener("keydown", onKey)

        return () => {
            window.removeEventListener("keydown", onKey)
        }

    }, [onRestart, onMenu])

    // ========================================================
    // RENDER
    // ========================================================

    return (

        <FlightLayout2 title="GAME OVER" footer="SHIP DESTROYED">

            <div className="mt-10 flex flex-col items-center gap-6 text-center font-mono">

                {/* ================================================== */}
                {/* HEADLINE */}
                {/* ================================================== */}

                <div className="text-lg tracking-[0.3em] text-red-400 drop-shadow-[0_0_10px_rgba(255,60,60,0.5)]">SHIP DESTROYED</div>

                {/* ================================================== */}
                {/* SCORE */}
                {/* ================================================== */}

                <div className="mt-2 flex flex-col items-center gap-3 border border-red-500/30 bg-red-500/5 px-10 py-6 shadow-[0_0_30px_rgba(255,60,60,0.08)]">

                    <div className="text-[9px] font-bold tracking-[0.35em] text-red-400/70">FINAL SCORE</div>
                    <div className="text-2xl font-bold uppercase tracking-[0.25em] text-red-300 drop-shadow-[0_0_12px_rgba(255,60,60,0.65)]">{score.toLocaleString()}</div>

                </div>

                {/* ================================================== */}
                {/* ACTIONS */}
                {/* ================================================== */}

                <div className="mt-4 flex flex-col gap-3 w-64">

                    {/* RESTART */}

                    <button type="button" onClick={onRestart} className="relative w-full border-2 border-cyan-300 bg-cyan-500/10 py-3 text-cyan-300 uppercase ntracking-[0.4em] transition-all cursor-pointer hover:bg-cyan-500/20 hover:shadow-[0_0_18px_rgba(0,255,255,0.25)]">
                        <span className="mr-2">▶</span>
                        RESTART
                        <span className="ml-2 text-[8px] text-white/30">[ENTER]</span>
                    </button>

                    {/* MAIN MENU */}

                    <button type="button" onClick={onMenu} className="w-full border border-[#39ff14]/30 bg-black/40 py-3 text-[#39ff14]/60 uppercase tracking-[0.4em] transition-all cursor-pointer hover:border-[#39ff14]/60 hover:text-cyan-300">
                        MAIN MENU
                        <span className="ml-2 text-[8px] text-white/20">[ESC]</span>
                    </button>

                </div>

            </div>

        </FlightLayout2>
    )
}