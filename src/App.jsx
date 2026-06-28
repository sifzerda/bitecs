//src/App.jsx

import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { spawnPlayer, spawnEnemy } from './ecs/entities.js'
import { Scene } from './renderers/Scene.jsx'
import { Header } from './components/Header.jsx'
import { HUD } from './components/HUD.jsx'
import { Footer } from './components/Footer.jsx'
import { gameState } from './state/gameState.js'

export default function App() {
  const keysRef       = useRef({})
  const playerRef     = useRef(null)
  const shootTimerRef = useRef(0)
  const initialised   = useRef(false)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (initialised.current) return
    initialised.current = true
    playerRef.current = spawnPlayer(0, 0)
    for (let i = 0; i < 8; i++) {
      spawnEnemy(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 14
      )
    }
  }, [])

  useEffect(() => {
    const down = e => {
      keysRef.current[e.key] = true
      if (e.key === 'Escape') handlePause()
    }
    const up = e => { keysRef.current[e.key] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup',   up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup',   up)
    }
  }, [])

  function handlePause() {
    gameState.paused = !gameState.paused
    setPaused(gameState.paused)
  }

 return (
    <div className="flex flex-col min-h-screen bg-gray-950">

      <Header />

<main className="flex-1 flex flex-col items-center justify-center overflow-hidden">
  <div className="border-2 border-green-400">
    <HUD onPause={handlePause} paused={paused} />
    <Canvas
      orthographic
      camera={{ zoom: 60, position: [0, 0, 10], near: 0.1, far: 100 }}
      style={{ width: 800, height: 600, display: 'block' }}
    >
      <Scene
        keysRef={keysRef}
        playerRef={playerRef}
        shootTimerRef={shootTimerRef}
        paused={paused}
      />
    </Canvas>
  </div>
</main>

      <Footer />

    </div>
  )
}
