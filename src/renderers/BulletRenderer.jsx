//src/renderers/BulletRenderer.jsx

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { bulletQuery } from '../ecs/constants/queries.js'
import * as THREE from 'three'
import { world } from '../ecs/constants/world.js'
import { Position, BulletTag } from '../ecs/constants/components.js'

const MAX_BULLETS = 256
const _matrix = new THREE.Matrix4()
const _position = new THREE.Vector3()
const _rotation = new THREE.Quaternion()
const _scale = new THREE.Vector3(1, 1, 1)
const _scaleZero = new THREE.Vector3(0, 0, 0)

export function BulletRenderer() {
    const meshRef = useRef()

    useFrame(() => {
        const mesh = meshRef.current
        if (!mesh) return

        const bullets = bulletQuery(world)

        for (let i = 0; i < bullets.length; i++) {
            const eid = bullets[i]
            _position.set(Position.x[eid], Position.y[eid], 0)
            _matrix.compose(_position, _rotation, _scale)
            mesh.setMatrixAt(i, _matrix)
        }

        _position.set(0, 0, 0)  // ← add this

        for (let i = bullets.length; i < MAX_BULLETS; i++) {
            _matrix.compose(_position, _rotation, _scaleZero)
            mesh.setMatrixAt(i, _matrix)
        }

        mesh.instanceMatrix.needsUpdate = true
        mesh.count = MAX_BULLETS
    })

    return (
        <instancedMesh ref={meshRef} args={[null, null, MAX_BULLETS]} frustumCulled={false}>
            <sphereGeometry args={[0.12, 6, 6]} />
            <meshStandardMaterial color="#ffdd44" emissive="#554400" />
        </instancedMesh>
    )
}