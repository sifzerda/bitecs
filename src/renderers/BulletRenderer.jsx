//src/renderers/BulletRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { bulletQuery } from '../ecs/constants/queries.js'
import * as THREE from 'three'
import { world } from '../ecs/constants/world.js'
import { Position, Velocity } from '../ecs/constants/components.js'

const MAX_BULLETS = 256

const _matrix = new THREE.Matrix4()
const _position = new THREE.Vector3()
const _rotation = new THREE.Quaternion()
const _scale = new THREE.Vector3()
const _scaleZero = new THREE.Vector3(0, 0, 0)
const _euler = new THREE.Euler()

const CORE_LENGTH = 0.55
const CORE_WIDTH = 0.09
const GLOW_LENGTH = 0.8
const GLOW_WIDTH = 0.22
const HALO_LENGTH = 1.1
const HALO_WIDTH = 0.4

// -------------------------
// Trail particles
// -------------------------

const MAX_TRAIL = 320
const TRAIL_PER_BULLET_PER_FRAME = 1   // how many trail dots each bullet drops per frame
const TRAIL_LIFE = 0.22
const TRAIL_SIZE_MIN = 0.16
const TRAIL_SIZE_MAX = 0.30

const _trailMatrix = new THREE.Matrix4()
const _trailPosition = new THREE.Vector3()
const _trailScale = new THREE.Vector3()
const _trailColor = new THREE.Color()
const _trailRotation = new THREE.Quaternion()

export function BulletRenderer() {

    const coreRef = useRef()
    const glowRef = useRef()
    const haloRef = useRef()
    const trailRef = useRef()

    const coreGeometry = useMemo(
        () => new THREE.CapsuleGeometry(CORE_WIDTH, CORE_LENGTH, 2, 6),
        []
    )

    const glowGeometry = useMemo(
        () => new THREE.CapsuleGeometry(GLOW_WIDTH, GLOW_LENGTH, 2, 6),
        []
    )

    const haloGeometry = useMemo(
        () => new THREE.CapsuleGeometry(HALO_WIDTH, HALO_LENGTH, 2, 6),
        []
    )

    const trailGeometry = useMemo(
        () => new THREE.SphereGeometry(0.5, 5, 5),
        []
    )

    const trailPool = useMemo(() => ({
        x: new Float32Array(MAX_TRAIL),
        y: new Float32Array(MAX_TRAIL),
        life: new Float32Array(MAX_TRAIL),
        maxLife: new Float32Array(MAX_TRAIL),
        size: new Float32Array(MAX_TRAIL),
        cursor: 0
    }), [])

    useFrame((_, delta) => {

        const core = coreRef.current
        const glow = glowRef.current
        const halo = haloRef.current
        const trail = trailRef.current
        if (!core || !glow || !halo || !trail) return

        const bullets = bulletQuery(world)

        for (let i = 0; i < bullets.length; i++) {

            const eid = bullets[i]

            _position.set(Position.x[eid], Position.y[eid], 0)

            const angle = Math.atan2(Velocity.y[eid], Velocity.x[eid]) - Math.PI / 2
            _euler.set(0, 0, angle)
            _rotation.setFromEuler(_euler)

            _scale.set(1, 1, 1)
            _matrix.compose(_position, _rotation, _scale)
            core.setMatrixAt(i, _matrix)
            glow.setMatrixAt(i, _matrix)
            halo.setMatrixAt(i, _matrix)

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

        _position.set(0, 0, 0)
        _rotation.identity()

        for (let i = bullets.length; i < MAX_BULLETS; i++) {
            _matrix.compose(_position, _rotation, _scaleZero)
            core.setMatrixAt(i, _matrix)
            glow.setMatrixAt(i, _matrix)
            halo.setMatrixAt(i, _matrix)
        }

        core.instanceMatrix.needsUpdate = true
        core.count = MAX_BULLETS

        glow.instanceMatrix.needsUpdate = true
        glow.count = MAX_BULLETS

        halo.instanceMatrix.needsUpdate = true
        halo.count = MAX_BULLETS

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
            {/* Trail — fading streak left behind each bolt */}
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

            {/* Outer halo — largest, faintest, adds soft fuzz */}
            <instancedMesh ref={haloRef} args={[null, null, MAX_BULLETS]} frustumCulled={false}>
                <primitive object={haloGeometry} attach="geometry" />
                <meshBasicMaterial
                    color="#77ffdd"
                    transparent
                    opacity={0.15}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </instancedMesh>

            {/* Mid glow */}
            <instancedMesh ref={glowRef} args={[null, null, MAX_BULLETS]} frustumCulled={false}>
                <primitive object={glowGeometry} attach="geometry" />
                <meshBasicMaterial
                    color="#66ffcc"
                    transparent
                    opacity={0.4}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </instancedMesh>

            {/* Bright core */}
            <instancedMesh ref={coreRef} args={[null, null, MAX_BULLETS]} frustumCulled={false}>
                <primitive object={coreGeometry} attach="geometry" />
                <meshBasicMaterial
                    color="#e8fff5"
                    transparent
                    opacity={0.95}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </instancedMesh>
        </>
    )
}