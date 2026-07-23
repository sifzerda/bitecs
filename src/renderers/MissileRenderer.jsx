// src/renderers/MissileRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { activeBullets } from '../ecs/pools/bulletPool.js'
import { Position, Velocity, Bullet } from '../ecs/constants/components.js'
import { getWeapon } from '../ecs/constants/weapons.js'

const MAX_MISSILES = 32

const BODY_LENGTH = 0.7
const BODY_WIDTH = 0.13
const FLAME_SIZE = 0.22

const _matrix = new THREE.Matrix4()
const _position = new THREE.Vector3()
const _rotation = new THREE.Quaternion()
const _scale = new THREE.Vector3()
const _scaleZero = new THREE.Vector3(0, 0, 0)
const _euler = new THREE.Euler()

export function MissileRenderer() {

    const bodyRef = useRef()
    const flameRef = useRef()

    const bodyGeometry = useMemo(() => new THREE.CapsuleGeometry(BODY_WIDTH, BODY_LENGTH, 2, 6), [])
    const flameGeometry = useMemo(() => new THREE.SphereGeometry(FLAME_SIZE, 6, 6), [])

    useFrame(() => {

        const body = bodyRef.current
        const flame = flameRef.current
        if (!body || !flame) return

        const bullets = activeBullets

        let idx = 0

        for (let i = 0; i < bullets.length && idx < MAX_MISSILES; i++) {

            const eid = bullets[i]
            if (Bullet.type[eid] !== 3) continue

            const vx = Velocity.x[eid]
            const vy = Velocity.y[eid]

            const angle = Math.atan2(vy, vx) - Math.PI / 2
            _euler.set(0, 0, angle)
            _rotation.setFromEuler(_euler)

            _position.set(Position.x[eid], Position.y[eid], 0)
            _scale.set(1, 1, 1)
            _matrix.compose(_position, _rotation, _scale)
            body.setMatrixAt(idx, _matrix)

            // flame sits just behind the tail, offset opposite the facing direction
            const speed = Math.hypot(vx, vy) || 1
            const backX = -(vx / speed) * (BODY_LENGTH * 0.55)
            const backY = -(vy / speed) * (BODY_LENGTH * 0.55)

            const flicker = 0.75 + Math.random() * 0.5

            _position.set(Position.x[eid] + backX, Position.y[eid] + backY, 0)
            _scale.set(flicker, flicker, flicker)
            _matrix.compose(_position, _rotation, _scale)
            flame.setMatrixAt(idx, _matrix)

            idx++

            // Smoke trail is handled by TrailRenderer (weapon.trail flag),
            // which drives the shared trail-puff pool for missiles, grenades,
            // and anything else flagged as a trailing weapon.
        }

        _position.set(0, 0, 0)
        _rotation.identity()

        for (let i = idx; i < MAX_MISSILES; i++) {
            _matrix.compose(_position, _rotation, _scaleZero)
            body.setMatrixAt(i, _matrix)
            flame.setMatrixAt(i, _matrix)
        }

        body.instanceMatrix.needsUpdate = true
        body.count = MAX_MISSILES

        flame.instanceMatrix.needsUpdate = true
        flame.count = MAX_MISSILES

    })

    return (
        <>
            <instancedMesh ref={flameRef} args={[null, null, MAX_MISSILES]} frustumCulled={false}>
                <primitive object={flameGeometry} attach="geometry" />
                <meshBasicMaterial
                    color="#ff6600"
                    transparent
                    opacity={0.8}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </instancedMesh>

            <instancedMesh ref={bodyRef} args={[null, null, MAX_MISSILES]} frustumCulled={false}>
                <primitive object={bodyGeometry} attach="geometry" />
                <meshBasicMaterial
                    color="#ffaa00"
                    transparent
                    opacity={0.95}
                    depthWrite={false}
                />
            </instancedMesh>
        </>
    )
}