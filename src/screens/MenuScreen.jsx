// src/screens/MenuScreen.jsx

import FlightLayout2 from "../components/FlightLayout2.jsx"
import { gameState, SCREEN } from "../state/gameState"
import { notifyUIChanged } from "../state/uiState"

export function MenuScreen() {

    return (
        <FlightLayout2 title="ASTEROIDS" footer="SECTOR CLEAR">

            {/* ================= RADAR BACKGROUND ================= */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-80">

                {/* sweep (reduced brightness) */}
                <div className="radar-sweep absolute w-105 h-105 rounded-full overflow-hidden opacity-80">
                    <div className="absolute inset-0 bg-[conic-gradient(from_0deg,rgba(0,255,255,0.0),rgba(0,255,255,0.18),rgba(0,255,255,0.0))]" />
                </div>

                {/* asteroid blips */}
                <div className="absolute w-105 h-105">

                    <div className="blip blip1" />
                    <div className="blip blip2" />
                    <div className="blip blip3" />
                    <div className="blip blip4" />

                </div>

                {/* rings */}
                <div className="absolute w-105 h-105 rounded-full border border-green-500/40" />
                <div className="absolute w-75 h-75 rounded-full border border-green-500/40" />
                <div className="absolute w-45 h-45 rounded-full border border-green-500/40" />

                {/* cross lines */}
                <div className="absolute w-105 h-px bg-cyan-400/5" />
                <div className="absolute w-px h-05 bg-cyan-400/5" />

            </div>

            {/* ================= MENU ================= */}

            <div className="relative z-10 mt-10 flex flex-col items-center gap-4 font-mono">

                <button
                    className="cursor-pointer relative w-56 py-3 uppercase tracking-[0.45em] text-sm border transition-all duration-200"
                    onClick={() => {
                        gameState.screen = SCREEN.PLAY
                        notifyUIChanged()
                    }}>
                    START
                </button>

                <button
                    className="cursor-pointer relative w-56 py-3 uppercase tracking-[0.45em] text-sm border transition-all duration-200"
                    onClick={() => {
                        gameState.screen = SCREEN.ARMOURY
                        notifyUIChanged()
                    }}>
                    ARMOURY
                </button>

                <button
                    className="cursor-pointer relative w-56 py-3 uppercase tracking-[0.45em] text-sm border transition-all duration-200"
                    onClick={() => {
                        gameState.screen = SCREEN.SETTINGS
                        notifyUIChanged()
                    }}>
                    SETTINGS
                </button>

            </div>

 

        </FlightLayout2>
    )
}