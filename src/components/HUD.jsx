// src/components/HUD.jsx

import { useEffect, useState } from 'react'
import { gameStats } from '../state/gameStats.js'
import { skipWave } from '../ecs/systems/waveSystem.js'
import { BOOST_COOLDOWN } from '../ecs/systems/playerControlSystem.js'

export function HUD({ onPause, paused }) {

    const [hud, setHud] = useState({
        score: gameStats.score,
        health: gameStats.health,
        lives: gameStats.lives,
        wave: gameStats.wave,
        asteroidsRemaining: gameStats.asteroidsRemaining,
        boostCooldown: gameStats.boostCooldown
    })

    useEffect(() => {

        const id = setInterval(() => {

            setHud({
                score: gameStats.score,
                health: gameStats.health,
                lives: gameStats.lives,
                wave: gameStats.wave,
                asteroidsRemaining: gameStats.asteroidsRemaining,
                boostCooldown: gameStats.boostCooldown
            })

        }, 100)

        return () => clearInterval(id)

    }, [])

    const healthPct = Math.max(0, hud.health / 100)
    const healthColor = healthPct > 0.5 ? "#44ff88" : healthPct > 0.25 ? "#ffdd44" : "#ff4466"

    const boostPct = Math.max(0, Math.min(1, 1 - hud.boostCooldown / BOOST_COOLDOWN))
    const boostReady = boostPct >= 1
    const boostColor = boostReady ? "#44ddff" : "#2a6a80"

    return (

        <div className="w-200 h-12 flex items-center justify-between px-4 bg-[#0a0a14] font-mono text-green-400 gap-3">

            <span className="text-sm tracking-widest uppercase">Asteroids</span>
            <span className="text-[#ff4466] text-sm">{"❤︎ ".repeat(hud.lives).trim()}</span>

            <div className="flex items-center gap-2 text-xs">

                <span>HP</span>

                <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">

                    <div
                        style={{
                            width: `${healthPct * 100}%`,
                            height: "100%",
                            background: healthColor,
                            transition: "width .15s"
                        }}
                    />

                </div>
                <span>{hud.health}</span>
            </div>





            <div className="flex items-center gap-2 text-xs">

                <span>BOOST</span>

                <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">

                    <div
                        style={{
                            width: `${boostPct * 100}%`,
                            height: "100%",
                            background: boostColor,
                            transition: "width .1s linear"
                        }}
                    />

                </div>

            </div>





            <span className="text-xs text-yellow-300">SCORE {hud.score}</span>
            <div className="flex flex-col leading-none text-right">
                <span>WAVE {hud.wave}</span>
                <span className="text-[10px] text-cyan-300">ASTEROIDS {hud.asteroidsRemaining}</span>
            </div>

            {!paused && (
                <button type="button" tabIndex={-1}
                    className="bg-transparent border-2 border-cyan-400 text-cyan-400 font-mono text-xs px-2 py-1 hover:bg-cyan-400 hover:text-black transition-colors"
                    onClick={(e) => {
                        e.currentTarget.blur()
                        skipWave()
                    }}>
                    ⏭ SKIP WAVE
                </button>
            )}

            <button type="button" tabIndex={-1}
                className="bg-transparent border-2 border-green-400 text-green-400 font-mono text-xs px-2 py-1 hover:bg-green-400 hover:text-black transition-colors"
                onClick={(e) => {
                    e.currentTarget.blur()
                    onPause()
                }}>
                {paused ? "▶ RESUME (P)" : "⏸ PAUSE (P)"}
            </button>

        </div>

    )

}