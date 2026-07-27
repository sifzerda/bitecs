// src/renderers/GrenadeRenderer.jsx
// Any bullet weapon flagged `explosive` (grenadegun, and any future
// lobbed/AOE bullet weapon) renders here instead of BulletRenderer's
// elongated bullet shader — a grenade should read as a round, tumbling
// shell, not a long thin dart.

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { activeBullets } from '../ecs/pools/bulletPool.js'
import { Position, Velocity, Bullet } from '../ecs/constants/components.js'
import { getWeapon } from '../ecs/weapons/config/weapons.js'

const MAX_GRENADES = 32
const BODY_RADIUS = 0.16

const _matrix = new THREE.Matrix4()
const _position = new THREE.Vector3()
const _rotation = new THREE.Quaternion()
const _scale = new THREE.Vector3(1, 1, 1)
const _scaleZero = new THREE.Vector3(0, 0, 0)
const _euler = new THREE.Euler()

export function GrenadeRenderer() {

    const bodyRef = useRef()
    const spinRef = useRef({}) // per-slot tumble angle, keyed by entity id so it's stable frame-to-frame

    const bodyGeometry = useMemo(() => new THREE.IcosahedronGeometry(BODY_RADIUS, 1), [])

    useFrame((state, delta) => {

        const body = bodyRef.current
        if (!body) return

        const bullets = activeBullets
        const spins = spinRef.current

        let idx = 0
        const seenIds = new Set()

        for (let i = 0; i < bullets.length && idx < MAX_GRENADES; i++) {

            const eid = bullets[i]
            const weapon = getWeapon(Bullet.type[eid])
            if (!weapon.explosive) continue

            seenIds.add(eid)

            // tumble as it flies — accumulate a per-entity spin angle so it
            // reads as rolling through the air rather than facing velocity
            spins[eid] = (spins[eid] ?? Math.random() * Math.PI * 2) + delta * 6.0

            _euler.set(0, 0, spins[eid])
            _rotation.setFromEuler(_euler)

            _position.set(Position.x[eid], Position.y[eid], 0)
            _matrix.compose(_position, _rotation, _scale)
            body.setMatrixAt(idx, _matrix)

            idx++

            // Smoke trail is handled by TrailRenderer (weapon.trail flag) —
            // same shared trail-puff pool used by missiles.
        }

        // drop stale spin entries for entities no longer active, so the map
        // doesn't grow unbounded over a long play session
        for (const key in spins) {
            if (!seenIds.has(Number(key))) delete spins[key]
        }

        _position.set(0, 0, 0)
        _rotation.identity()

        for (let i = idx; i < MAX_GRENADES; i++) {
            _matrix.compose(_position, _rotation, _scaleZero)
            body.setMatrixAt(i, _matrix)
        }

        body.instanceMatrix.needsUpdate = true
        body.count = MAX_GRENADES

    })

    return (
        <instancedMesh ref={bodyRef} args={[null, null, MAX_GRENADES]} frustumCulled={false}>
            <primitive object={bodyGeometry} attach="geometry" />
            <meshStandardMaterial
                color="#3a4650"
                metalness={0.6}
                roughness={0.4}
                emissive="#ff6600"
                emissiveIntensity={0.25}
            />
        </instancedMesh>
    )
}