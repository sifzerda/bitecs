// src/screens/GameCompleteScreen.jsx

import { TOTAL_LEVELS } from "../../store/gameStore.js"
import { startState } from "../state/startState.js"

export default function GameCompleteScreen({
    onPlayAgain,
    onMenu,
}) {
    const score = startState.score ?? 0

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 px-6 backdrop-blur-xl">
            <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-cyan-400/30 bg-slate-950/95 p-8 text-center shadow-[0_0_80px_rgba(34,211,238,0.12)]">

                <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-80 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />

                <div className="relative">
                    <div className="mb-4 text-5xl">
                        🏆
                    </div>

                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.4em] text-cyan-400">
                        Mission Accomplished
                    </p>

                    <h1 className="mb-3 text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
                        Campaign Complete!
                    </h1>

                    <p className="mx-auto mb-8 max-w-sm text-sm leading-relaxed text-slate-400">
                        You've survived every asteroid wave,
                        defeated every boss, and conquered
                        all {TOTAL_LEVELS} levels.
                    </p>

                    <div className="mb-8 grid grid-cols-2 gap-3">
                        <Stat
                            label="Levels Cleared"
                            value={TOTAL_LEVELS}
                        />

                        <Stat
                            label="Final Score"
                            value={score.toLocaleString()}
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            type="button"
                            onClick={onPlayAgain}
                            className="w-full rounded-xl bg-cyan-400 px-6 py-3 font-bold uppercase tracking-widest text-slate-950 transition hover:bg-cyan-300"
                        >
                            Play Again
                        </button>

                        <button
                            type="button"
                            onClick={onMenu}
                            className="w-full rounded-xl border border-white/15 bg-white/5 px-6 py-3 font-bold uppercase tracking-widest text-white transition hover:bg-white/10"
                        >
                            Main Menu
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function Stat({ label, value }) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-4">
            <div className="text-xl font-black text-white">
                {value}
            </div>

            <div className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">
                {label}
            </div>
        </div>
    )
}
