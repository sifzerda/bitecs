//src/renderers/PlayerRenderer.jsx

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { playerQuery } from '../ecs/queries.js'
import { Position, Rotation } from '../ecs/components.js'

export function PlayerRenderer() {
  const meshRef = useRef()

  useFrame(() => {

    const ids = playerQuery()
    if (ids.length === 0) return
    const id = ids[0]
    const mesh = meshRef.current

    if (!mesh) return
    mesh.position.x = Position.x[id]
    mesh.position.y = Position.y[id]
    mesh.rotation.z = Rotation[id]
  })

  return (
    <mesh ref={meshRef}>
      <coneGeometry args={[0.4, 1, 3]} />
      <meshStandardMaterial 
        color="#00ccff" 
        emissive="#003344"
      />
    </mesh>
  )
}