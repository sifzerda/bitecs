//src/renderers/BulletRenderer.jsx

import { useMemo, useRef } from 'react'
import { createRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { bulletQuery } from '../ecs/constants/queries.js'
import * as THREE from 'three'
import { Position, Velocity, Bullet } from '../ecs/constants/components.js'
import { WEAPONS } from '../ecs/constants/weapons.js'

const MAX_BULLETS = 128

const _matrix = new THREE.Matrix4()
const _position = new THREE.Vector3()
const _rotation = new THREE.Quaternion()
const _scale = new THREE.Vector3(1, 1, 1)
const _scaleZero = new THREE.Vector3(0, 0, 0)
const _euler = new THREE.Euler()
const _zeroPos = new THREE.Vector3(0, 0, 0)
const _identityRot = new THREE.Quaternion()

const CORE_LENGTH = 0.55
const CORE_WIDTH = 0.09
const GLOW_LENGTH = 0.8
const GLOW_WIDTH = 0.22
const HALO_LENGTH = 1.1
const HALO_WIDTH = 0.4

// -------------------------
// Trail particles (shared across all weapon types for now)
// -------------------------

const MAX_TRAIL = 320
const TRAIL_PER_BULLET_PER_FRAME = 1
const TRAIL_LIFE = 0.22
const TRAIL_SIZE_MIN = 0.16
const TRAIL_SIZE_MAX = 0.30

const _trailMatrix = new THREE.Matrix4()
const _trailPosition = new THREE.Vector3()
const _trailScale = new THREE.Vector3()
const _trailColor = new THREE.Color()
const _trailRotation = new THREE.Quaternion()

export function BulletRenderer() {

    const trailRef = useRef()

    // one {core, glow, halo} ref set per weapon type — adding a weapon to WEAPONS
    // automatically gets its own render layer here, no other code changes needed
    const meshRefs = useRef(WEAPONS.map(() => ({
        core: createRef(),
        glow: createRef(),
        halo: createRef(),
    })))

    const coreGeometry = useMemo(() => new THREE.CapsuleGeometry(CORE_WIDTH, CORE_LENGTH, 2, 6), [])
    const glowGeometry = useMemo(() => new THREE.CapsuleGeometry(GLOW_WIDTH, GLOW_LENGTH, 2, 6), [])
    const haloGeometry = useMemo(() => new THREE.CapsuleGeometry(HALO_WIDTH, HALO_LENGTH, 2, 6), [])
    const trailGeometry = useMemo(() => new THREE.SphereGeometry(0.5, 5, 5), [])

    const trailPool = useMemo(() => ({
        x: new Float32Array(MAX_TRAIL),
        y: new Float32Array(MAX_TRAIL),
        life: new Float32Array(MAX_TRAIL),
        maxLife: new Float32Array(MAX_TRAIL),
        size: new Float32Array(MAX_TRAIL),
        cursor: 0
    }), [])

    useFrame((_, delta) => {

        const trail = trailRef.current
        if (!trail) return

        const bullets = bulletQuery()
        const counters = new Array(WEAPONS.length).fill(0)

        for (let i = 0; i < bullets.length; i++) {

            const eid = bullets[i]
            const type = Bullet.type[eid]
            const refs = meshRefs.current[type]

            if (!refs || !refs.core.current || !refs.glow.current || !refs.halo.current) continue

            const idx = counters[type]
            if (idx >= MAX_BULLETS) continue   // safety cap if a burst overflows

            _position.set(Position.x[eid], Position.y[eid], 0)

            const angle = Math.atan2(Velocity.y[eid], Velocity.x[eid]) - Math.PI / 2
            _euler.set(0, 0, angle)
            _rotation.setFromEuler(_euler)

            _matrix.compose(_position, _rotation, _scale)
            refs.core.current.setMatrixAt(idx, _matrix)
            refs.glow.current.setMatrixAt(idx, _matrix)
            refs.halo.current.setMatrixAt(idx, _matrix)

            counters[type]++

            // -------------------------
            // Drop trail particles behind this bullet
            // -------------------------

            for (let n = 0; n < TRAIL_PER_BULLET_PER_FRAME; n++) {

                const slot = trailPool.cursor
                trailPool.cursor = (trailPool.cursor + 1) % MAX_TRAIL

                trailPool.x[slot] = Position.x[eid]
                trailPool.y[slot] = Position.y[eid]
                trailPool.life[slot] = TRAIL_LIFE
                trailPool.maxLife[slot] = TRAIL_LIFE
                trailPool.size[slot] = TRAIL_SIZE_MIN + Math.random() * (TRAIL_SIZE_MAX - TRAIL_SIZE_MIN)
            }
        }

        // zero out unused instances per weapon type, then flag updates
        for (let t = 0; t < WEAPONS.length; t++) {

            const refs = meshRefs.current[t]
            if (!refs || !refs.core.current || !refs.glow.current || !refs.halo.current) continue

            for (let i = counters[t]; i < MAX_BULLETS; i++) {
                _matrix.compose(_zeroPos, _identityRot, _scaleZero)
                refs.core.current.setMatrixAt(i, _matrix)
                refs.glow.current.setMatrixAt(i, _matrix)
                refs.halo.current.setMatrixAt(i, _matrix)
            }

            refs.core.current.instanceMatrix.needsUpdate = true
            refs.core.current.count = MAX_BULLETS

            refs.glow.current.instanceMatrix.needsUpdate = true
            refs.glow.current.count = MAX_BULLETS

            refs.halo.current.instanceMatrix.needsUpdate = true
            refs.halo.current.count = MAX_BULLETS
        }

        // -------------------------
        // Update + draw trail particles
        // -------------------------

        for (let i = 0; i < MAX_TRAIL; i++) {

            if (trailPool.life[i] <= 0) {
                _trailMatrix.compose(_trailPosition.set(0, 0, 0), _trailRotation, _scaleZero)
                trail.setMatrixAt(i, _trailMatrix)
                continue
            }

            trailPool.life[i] -= delta

            const t = Math.max(0, trailPool.life[i] / trailPool.maxLife[i])
            const eased = t * t
            const s = trailPool.size[i] * eased

            _trailPosition.set(trailPool.x[i], trailPool.y[i], -0.01)
            _trailScale.set(s, s, s)
            _trailMatrix.compose(_trailPosition, _trailRotation, _trailScale)
            trail.setMatrixAt(i, _trailMatrix)

            _trailColor.setHSL(0.42, 1, 0.5 + 0.3 * eased)
            trail.setColorAt(i, _trailColor)
        }

        trail.instanceMatrix.needsUpdate = true
        if (trail.instanceColor) trail.instanceColor.needsUpdate = true
        trail.count = MAX_TRAIL

    })

    return (
        <>
            {/* Trail — shared across weapon types */}
            <instancedMesh ref={trailRef} args={[null, null, MAX_TRAIL]} frustumCulled={false}>
                <primitive object={trailGeometry} attach="geometry" />
                <meshBasicMaterial
                    transparent
                    opacity={0.5}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    vertexColors={false}
                />
            </instancedMesh>

            {/* One core/glow/halo trio per weapon type */}
        {WEAPONS
    .filter(weapon => !weapon.customRenderer && !weapon.isBeam)
    .map((weapon) => {
        const i = weapon.id   // index must match Bullet.type values used elsewhere
        return (
            <group key={weapon.id}>

                <instancedMesh ref={meshRefs.current[i].halo} args={[null, null, MAX_BULLETS]} frustumCulled={false}>
                    <primitive object={haloGeometry} attach="geometry" />
                    <meshBasicMaterial
                        color={weapon.haloColor}
                        transparent
                        opacity={0.15}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                    />
                </instancedMesh>

                <instancedMesh ref={meshRefs.current[i].glow} args={[null, null, MAX_BULLETS]} frustumCulled={false}>
                    <primitive object={glowGeometry} attach="geometry" />
                    <meshBasicMaterial
                        color={weapon.glowColor}
                        transparent
                        opacity={0.4}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                    />
                </instancedMesh>

                <instancedMesh ref={meshRefs.current[i].core} args={[null, null, MAX_BULLETS]} frustumCulled={false}>
                    <primitive object={coreGeometry} attach="geometry" />
                    <meshBasicMaterial
                        color={weapon.color}
                        transparent
                        opacity={0.95}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                    />
                </instancedMesh>

            </group>
        )
    })}
        </>
    )
}