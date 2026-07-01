// src/components/HUD.jsx

import { useEffect, useState } from 'react'
import { gameStats } from '../state/gameStats.js'
import { progressionState } from '../progression/progressionState'

export function HUD({ onPause, paused }) {

  const [hud, setHud] = useState({
    score: 0,
    health: 100,
    lives: 3,

    wave: 1,
 

  
  
 
 

    enemiesRemaining: 0,
    enemyTarget: 0
  })

  useEffect(() => {

    const id = setInterval(() => {

      setHud({
        score: gameStats.score,
        health: gameStats.health,
        lives: gameStats.lives,

        wave: progressionState.wave.number,
 

        enemiesRemaining: progressionState.wave.enemiesRemaining,
        enemyTarget: progressionState.wave.enemyTarget
      })

    }, 100)

    return () => clearInterval(id)

  }, [])

  const healthPct = Math.max(0, hud.health / 100)

  const healthColor =
    healthPct > 0.5
      ? '#44ff88'
      : healthPct > 0.25
        ? '#ffdd44'
        : '#ff4466'

  return (
    <div className="w-200 h-12 flex items-center justify-between px-4 bg-[#0a0a14] font-mono text-green-400 gap-3">

      <span className="text-sm tracking-widest uppercase">
        Asteroids
      </span>

      <span className="text-[#ff4466] text-sm">
        {'❤︎ '.repeat(hud.lives).trim()}
      </span>

      <div className="flex items-center gap-2 text-xs">

        <span>HP</span>

        <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            style={{
              width: `${healthPct * 100}%`,
              height: '100%',
              background: healthColor,
              transition: 'width .15s'
            }}
          />
        </div>

        <span>{hud.health}</span>

        <div className="flex gap-3 text-[11px]">

   

        </div>

      </div>

      <span className="text-xs text-yellow-300">SCORE {hud.score}</span>
      <div className="flex flex-col leading-none">
        <span>WAVE {hud.wave}</span>
        <span>Asteroids Spawned: {hud.enemiesSpawned}</span>
        <span className="text-[10px] text-cyan-300">Remaining: {hud.enemiesRemaining} / Target: {hud.enemyTarget}</span>

      </div>

      <button
        type="button"
        tabIndex={-1}
        className="bg-transparent border-2 border-green-400 text-green-400 font-mono text-xs px-2 py-1 hover:bg-green-400 hover:text-black transition-colors"
        onClick={(e) => {
          e.currentTarget.blur()
          onPause()
        }}>

        {paused ? '▶ RESUME (P)' : '⏸ PAUSE (P)'}
      </button>

    </div>
  )
}