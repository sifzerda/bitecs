// src/components/HUD.jsx

import { useEffect, useState } from 'react'
import { gameStats } from '../state/gameStats.js'

export function HUD({ onPause, paused }) {
  const [score, setScore] = useState(0)
  const [health, setHealth] = useState(100)
  const [lives, setLives] = useState(3)
  const [wave, setWave] = useState(1)

  useEffect(() => {
    const id = setInterval(() => {
      setScore(gameStats.score)
      setHealth(gameStats.health)
      setLives(gameStats.lives)
      setWave(gameStats.wave)
    }, 50)

    return () => clearInterval(id)
  }, [])

  const healthPct = Math.max(0, health / 100)
  const healthColor = healthPct > 0.5 ? '#44ff88' : healthPct > 0.25 ? '#ffdd44' : '#ff4466'

  return (
    <div className="w-200 h-12 flex items-center justify-between px-4 bg-[#0a0a14] border-b-0 font-mono text-green-400 gap-3">

      <span className="text-sm tracking-widest uppercase whitespace-nowrap">Asteroids</span>
      <span className="text-[#ff4466] text-sm tracking-widest whitespace-nowrap">{'🚀 '.repeat(lives).trim()}</span>

      <div className="flex items-center gap-2 text-xs text-gray-400 whitespace-nowrap">
        <span>HP</span>
        <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div style={{
            width: `${healthPct * 100}%`,
            height: '100%',
            background: healthColor,
            borderRadius: 4,
            transition: 'width 0.1s, background 0.3s',
          }} />
        </div>
        <span>{health}</span>
      </div>

      <span className="text-xs text-yellow-300 whitespace-nowrap">SCORE {score}</span>
      <span className="text-xs text-yellow-300 whitespace-nowrap">WAVE {wave}</span>

      <button
        type="button"
        tabIndex={-1}
        className="bg-transparent border-2 border-green-400 text-green-400 font-mono text-xs px-2 py-1 tracking-wide whitespace-nowrap hover:bg-green-400 hover:text-black transition-colors"
        onClick={(e) => {
          e.currentTarget.blur()
          onPause()
        }}>
        {paused ? '▶ RESUME (P)' : '⏸ PAUSE (P)'}
      </button>

    </div>
  )
}