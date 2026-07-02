//src/renderers/BoostRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { playerQuery } from '../ecs/constants/queries.js'
import { world } from '../ecs/constants/world.js'
import { Position, Rotation, Velocity } from '../ecs/constants/components.js'
import { gameStats } from '../state/gameStats.js'

const MAX_PARTICLES = 80
const EMIT_PER_FRAME = 2
const PARTICLE_LIFE = 0.4
const SPEED = 3.5
const SPREAD = 0.5

const _matrix = new THREE.Matrix4()
const _position = new THREE.Vector3()
const _rotation = new THREE.Quaternion()
const _scale = new THREE.Vector3()
const _scaleZero = new THREE.Vector3(0, 0, 0)
const _color = new THREE.Color()

export function BoostRenderer() {

    const meshRef = useRef()

    // particle pool: plain arrays, mutated in place, never trigger React renders
    const pool = useMemo(() => ({
        x: new Float32Array(MAX_PARTICLES),
        y: new Float32Array(MAX_PARTICLES),
        vx: new Float32Array(MAX_PARTICLES),
        vy: new Float32Array(MAX_PARTICLES),
        life: new Float32Array(MAX_PARTICLES),   // <=0 means dead
        cursor: 0
    }), [])

    useFrame((_, delta) => {

        const mesh = meshRef.current
        if (!mesh) return

        const players = playerQuery()

        // -------------------------
        // Emit new particles while boosting
        // -------------------------

        if (gameStats.boostActive > 0 && players.length > 0) {

            const pid = players[0]

            const facingX = Math.sin(-Rotation[pid])
            const facingY = Math.cos(-Rotation[pid])

            for (let n = 0; n < EMIT_PER_FRAME; n++) {

                const slot = pool.cursor
                pool.cursor = (pool.cursor + 1) % MAX_PARTICLES

                const spread = (Math.random() - 0.5) * SPREAD

                pool.x[slot] = Position.x[pid] - facingX * 0.4
                pool.y[slot] = Position.y[pid] - facingY * 0.4

                pool.vx[slot] = -facingX * SPEED + spread + Velocity.x[pid] * 0.2
                pool.vy[slot] = -facingY * SPEED + spread + Velocity.y[pid] * 0.2

                pool.life[slot] = PARTICLE_LIFE
            }
        }

        // -------------------------
        // Update + draw all particles
        // -------------------------

        for (let i = 0; i < MAX_PARTICLES; i++) {

            if (pool.life[i] <= 0) {
                _matrix.compose(_position.set(0, 0, 0), _rotation, _scaleZero)
                mesh.setMatrixAt(i, _matrix)
                continue
            }

            pool.life[i] -= delta
            pool.x[i] += pool.vx[i] * delta
            pool.y[i] += pool.vy[i] * delta

            const t = Math.max(0, pool.life[i] / PARTICLE_LIFE)   // 1 -> 0
            const s = 0.25 * t

            _position.set(pool.x[i], pool.y[i], 0)
            _scale.set(s, s, s)
            _matrix.compose(_position, _rotation, _scale)
            mesh.setMatrixAt(i, _matrix)

            _color.setHSL(0.55, 1, 0.5 + 0.3 * t)
            mesh.setColorAt(i, _color)
        }

        mesh.instanceMatrix.needsUpdate = true
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
        mesh.count = MAX_PARTICLES

    })

    return (
        <instancedMesh
            ref={meshRef}
            args={[null, null, MAX_PARTICLES]}
            frustumCulled={false}>
            <sphereGeometry args={[0.5, 6, 6]} />
            <meshBasicMaterial
                color="#66ddff"
                transparent
                opacity={0.85}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </instancedMesh>
    )
}