//src/renderers/PlayerRenderer.jsx

import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { query } from 'bitecs'
import { world } from '../ecs/world.js'
import { Position, Rotation, PlayerTag } from '../ecs/components.js'

export function PlayerRenderer() {
  const meshRef = useRef()

  useFrame(() => {
    const [eid] = query(world, [Position, PlayerTag])
    if (eid === undefined || !meshRef.current) return

    meshRef.current.position.x = Position.x[eid]
    meshRef.current.position.y = Position.y[eid]
    meshRef.current.rotation.z = Rotation[eid]
  })

  return (
    <mesh ref={meshRef}>
      {/* Simple triangle ship */}
      <coneGeometry args={[0.4, 1, 3]} />
      <meshStandardMaterial color="#00ccff" emissive="#003344" />
    </mesh>
  )
}