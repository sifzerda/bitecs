// src/components/HUD.jsx

import { useEffect, useState } from "react"
import { simState } from "../state/simState.js"
import { skipWave } from "../ecs/systems/waveSystem.js"
import {
  useGameStore,
  formatLevelLabel,
  isBossLevel,
} from "../../store/gameStore.js"

export function HUD({ onPause, paused }) {
  const level = useGameStore((s) => s.level)

  const [hud, setHud] = useState({
    score: simState.score,
    health: simState.health,
    lives: simState.lives,
    asteroidsRemaining: simState.asteroidsRemaining,
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
        }

        if (
          prev.score !== next.score ||
          prev.health !== next.health ||
          prev.lives !== next.lives ||
          prev.asteroidsRemaining !== next.asteroidsRemaining
        ) {
          return next
        }

        return prev
      })

      frame = requestAnimationFrame(update)
    }

    update()

    return () => cancelAnimationFrame(frame)
  }, [])

  const healthPct = Math.max(
    0,
    Math.min(1, hud.health / 100)
  )

  const healthColor =
    healthPct > 0.5
      ? "#44ff88"
      : healthPct > 0.25
        ? "#ffdd44"
        : "#ff4466"

  const boss = isBossLevel(level)

  return (
    <div
      className="
        w-full
        h-12
        flex
        items-center
        justify-between
        px-4
        gap-3
        bg-[#0a0a14]
        border-b
        border-green-400/30
        font-mono
        text-green-400
      "
    >
      {/* GAME TITLE */}

      <span className="text-sm tracking-widest uppercase">
        Asteroids
      </span>


      {/* LIVES */}

      <span className="text-[#ff4466] text-sm whitespace-nowrap">
        {"❤︎ ".repeat(Math.max(0, hud.lives)).trim()}
      </span>


      {/* HEALTH */}

      <div className="flex items-center gap-2 text-xs">
        <span>HP</span>

        <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            style={{
              width: `${healthPct * 100}%`,
              height: "100%",
              background: healthColor,
              transition: "width .15s",
            }}
          />
        </div>

        <span>
          {Math.max(0, Math.round(hud.health))}
        </span>
      </div>


      {/* BOOST */}

      <div className="flex items-center gap-2 text-xs">
        <span>BOOST</span>

        <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
          {/* Boost bar can be connected to simState later */}
        </div>
      </div>


      {/* SCORE */}

      <span className="text-xs text-yellow-300 whitespace-nowrap">
        SCORE {hud.score}
      </span>


      {/* LEVEL */}

      <div className="flex flex-col leading-none text-right">
        <span
          className={
            boss
              ? "text-yellow-300"
              : "text-cyan-300"
          }
        >
          {formatLevelLabel(level)}
        </span>

        {!boss && (
          <span className="text-[10px] text-cyan-300">
            ASTEROIDS {hud.asteroidsRemaining}
          </span>
        )}

        {boss && (
          <span className="text-[10px] text-yellow-400/80">
            BOSS
          </span>
        )}
      </div>


      {/* SKIP WAVE */}

      {!paused && !boss && (
        <button
          type="button"
          tabIndex={-1}
          className="
            bg-transparent
            border-2
            border-cyan-400
            text-cyan-400
            font-mono
            text-xs
            px-2
            py-1
            hover:bg-cyan-400
            hover:text-black
            transition-colors
          "
          onClick={(e) => {
            e.currentTarget.blur()
            skipWave()
          }}
        >
          ⏭ SKIP WAVE
        </button>
      )}


      {/* PAUSE */}

      <button
        type="button"
        tabIndex={-1}
        className="
          bg-transparent
          border-2
          border-green-400
          text-green-400
          font-mono
          text-xs
          px-2
          py-1
          hover:bg-green-400
          hover:text-black
          transition-colors
        "
        onClick={(e) => {
          e.currentTarget.blur()
          onPause()
        }}
      >
        {paused
          ? "▶ RESUME (P)"
          : "⏸ PAUSE (P)"}
      </button>
    </div>
  )
}