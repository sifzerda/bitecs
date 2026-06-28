// src/hooks/useGameLoop.js

import { useEffect, useRef } from 'react'
import { world } from '../ecs/world.js'

export function useGameLoop(tick) {
  const rafRef = useRef(null)
  const tickRef = useRef(tick)
  tickRef.current = tick  // always call the latest version

  useEffect(() => {
    function loop(now) {
      world.time.delta = Math.min((now - world.time.then) / 1000, 0.05)
      world.time.elapsed += world.time.delta
      world.time.then = now

      tickRef.current()
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])
}