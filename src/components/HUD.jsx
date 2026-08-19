// src/components/HUD.jsx

import { useEffect, useState } from "react"
import { simState } from "../state/simState.js"
import { skipWave } from "../ecs/systems/waveSystem.js"
import { useGameStore, formatLevelLabel, isBossLevel } from "../../store/gameStore.js"

export function HUD({ onPause, paused }) {
  const level = useGameStore((s) => s.level)

  const [hud, setHud] = useState({
    score: simState.score,
    health: simState.health,
    lives: simState.lives,
    asteroidsRemaining: simState.asteroidsRemaining,
    bossAlive: simState.bossAlive,
  })

  useEffect(() => {
    let frame

    const update = () => {
      setHud((prev) => {
        const next = {
          score: simState.score,
          health: simState.health,
          lives: simState.lives,
          asteroidsRemaining: simState.asteroidsRemaining,
          bossAlive: simState.bossAlive,
        }

        for (const k in next) {
          if (prev[k] !== next[k]) return next
        }
        return prev
      })

      frame = requestAnimationFrame(update)
    }

    update()
    return () => cancelAnimationFrame(frame)
  }, [])

  const healthPct = Math.max(0, hud.health / 100)
  const healthColor = healthPct > 0.5 ? "#44ff88" : healthPct > 0.25 ? "#ffdd44" : "#ff4466"
  const boss = isBossLevel(level) || hud.bossAlive

  return (
    <div className="w-200 h-12 flex items-center justify-between px-4 bg-[#0a0a14] font-mono text-green-400 gap-3">
      <span className="text-sm tracking-widest uppercase">Asteroids</span>
      <span className="text-[#ff4466] text-sm">{"❤︎ ".repeat(Math.max(0, hud.lives)).trim()}</span>

      <div className="flex items-center gap-2 text-xs">
        <span>HP</span>
        <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div style={{ width: `${healthPct * 100}%`, height: "100%", background: healthColor, transition: "width .15s" }} />
        </div>
        <span>{hud.health}</span>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span>BOOST</span>
        <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden" />
      </div>

      <span className="text-xs text-yellow-300">SCORE {hud.score}</span>

      <div className="flex flex-col leading-none text-right">
        <span className={boss ? "text-yellow-300" : undefined}>{formatLevelLabel(level)}</span>
        {!boss && (<span className="text-[10px] text-cyan-300">ASTEROIDS {hud.asteroidsRemaining}</span>)}
        {boss && (<span className="text-[10px] text-yellow-400/80">BOSS</span>)}
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