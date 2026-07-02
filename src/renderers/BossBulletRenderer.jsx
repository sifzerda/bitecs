//src/renderers/BossBulletRenderer.jsx

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { bossBulletQuery } from '../ecs/constants/queries.js'
import * as THREE from 'three'
import { world } from '../ecs/constants/world.js'
import { Position } from '../ecs/constants/components.js'

const MAX_ENEMY_BULLETS = 128
const _matrix = new THREE.Matrix4()
const _position = new THREE.Vector3()
const _rotation = new THREE.Quaternion()
const _scale = new THREE.Vector3(1, 1, 1)
const _scaleZero = new THREE.Vector3(0, 0, 0)

export function BossBulletRenderer() {
    const meshRef = useRef()

    useFrame(() => {
        const mesh = meshRef.current
        if (!mesh) return

        const bullets = bossBulletQuery(world)

        for (let i = 0; i < bullets.length; i++) {
            const eid = bullets[i]
            _position.set(Position.x[eid], Position.y[eid], 0)
            _matrix.compose(_position, _rotation, _scale)
            mesh.setMatrixAt(i, _matrix)
        }

        _position.set(0, 0, 0)

        for (let i = bullets.length; i < MAX_ENEMY_BULLETS; i++) {
            _matrix.compose(_position, _rotation, _scaleZero)
            mesh.setMatrixAt(i, _matrix)
        }

        mesh.instanceMatrix.needsUpdate = true
        mesh.count = MAX_ENEMY_BULLETS
    })

    return (
        <instancedMesh ref={meshRef} args={[null, null, MAX_ENEMY_BULLETS]} frustumCulled={false}>
            <sphereGeometry args={[0.14, 6, 6]} />
            <meshStandardMaterial color="#ff5522" emissive="#552200" />
        </instancedMesh>
    )
}