// src/renderers/EnemyBulletRenderer.jsx

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { enemyBulletQuery } from '../ecs/constants/queries'
import { Position } from '../ecs/components'

const MAX_ENEMY_BULLETS = 64

export function EnemyBulletRenderer() {
    const meshRef = useRef()
    const dummy = useRef(new THREE.Object3D()).current

    useFrame(() => {
        const bullets = enemyBulletQuery()
        const mesh = meshRef.current
        if (!mesh) return

        for (let i = 0; i < bullets.length; i++) {
            const id = bullets[i]

            dummy.position.set(Position.x[id], Position.y[id], 0)
            dummy.rotation.set(0, 0, 0)
            dummy.scale.setScalar(1)
            dummy.updateMatrix()

            mesh.setMatrixAt(i, dummy.matrix)
        }

        mesh.count = bullets.length
        mesh.instanceMatrix.needsUpdate = true
    })

    return (
        <instancedMesh ref={meshRef} args={[null, null, MAX_ENEMY_BULLETS]} frustumCulled={false}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial
                color="#ff3344"
                emissive="#ff0022"
                emissiveIntensity={2}
                toneMapped={false}
            />
        </instancedMesh>
    )
}