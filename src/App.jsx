//src/App.jsx

import { useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { spawnPlayer, spawnEnemy } from './ecs/entities.js'
import { Scene } from './renderers/Scene.jsx'

export default function App() {
  const keysRef = useRef({})
  const playerRef = useRef(null)
  const shootTimerRef = useRef(0)
  const initialised = useRef(false)

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
    const down = e => { keysRef.current[e.key] = true }
    const up = e => { keysRef.current[e.key] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  return (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
  }}>
    <div style={{ border: '2px solid #44ff88' }}>
      <Canvas
        orthographic
        camera={{ zoom: 60, position: [0, 0, 10], near: 0.1, far: 100 }}
        style={{ width: 800, height: 600, display: 'block' }}
      >
        <Scene
          keysRef={keysRef}
          playerRef={playerRef}
          shootTimerRef={shootTimerRef}
        />
      </Canvas>
    </div>
  </div>
)
}