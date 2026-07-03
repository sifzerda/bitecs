//src/renderers/BoostRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { playerQuery } from '../ecs/constants/queries.js'
import { world } from '../ecs/constants/world.js'
import { Position, Rotation, Velocity } from '../ecs/constants/components.js'
import { gameState } from '../state/gameState.js'

const MAX_PARTICLES = 100
const EMIT_PER_FRAME = 3
const PARTICLE_LIFE_MIN = 0.25
const PARTICLE_LIFE_MAX = 0.5
const SPEED_MIN = 2.0
const SPEED_MAX = 4.5
const CONE_ANGLE = 0.5          // radians, spread cone behind the ship
const PARTICLE_DRAG = 0.90      // per-frame velocity decay — stops the "string" look
const VELOCITY_INHERIT = 0.05   // was 0.2 — high values lock particles to ship motion
const SIZE_MIN = 0.12
const SIZE_MAX = 0.28

const _matrix = new THREE.Matrix4()
const _position = new THREE.Vector3()
const _rotation = new THREE.Quaternion()
const _scale = new THREE.Vector3()
const _scaleZero = new THREE.Vector3(0, 0, 0)
const _color = new THREE.Color()

export function BoostRenderer() {

    const meshRef = useRef()

    const pool = useMemo(() => ({
        x: new Float32Array(MAX_PARTICLES),
        y: new Float32Array(MAX_PARTICLES),
        vx: new Float32Array(MAX_PARTICLES),
        vy: new Float32Array(MAX_PARTICLES),
        life: new Float32Array(MAX_PARTICLES),
        maxLife: new Float32Array(MAX_PARTICLES),
        size: new Float32Array(MAX_PARTICLES),
        cursor: 0
    }), [])

    useFrame((_, delta) => {

        const mesh = meshRef.current
        if (!mesh) return

        const players = playerQuery()

        // -------------------------
        // Emit new particles while boosting
        // -------------------------

        if (gameState.boostActive > 0 && players.length > 0) {

            const pid = players[0]

            const facingAngle = Math.atan2(Math.sin(-Rotation[pid]), Math.cos(-Rotation[pid]))

            for (let n = 0; n < EMIT_PER_FRAME; n++) {

                const slot = pool.cursor
                pool.cursor = (pool.cursor + 1) % MAX_PARTICLES

                // random angle within a cone pointing backward from the ship
                const angle = facingAngle + Math.PI + (Math.random() - 0.5) * CONE_ANGLE
                const speed = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN)

                const dirX = Math.cos(angle)
                const dirY = Math.sin(angle)

                pool.x[slot] = Position.x[pid] - Math.sin(-Rotation[pid]) * 0.4
                pool.y[slot] = Position.y[pid] - Math.cos(-Rotation[pid]) * 0.4

                pool.vx[slot] = dirX * speed + Velocity.x[pid] * VELOCITY_INHERIT
                pool.vy[slot] = dirY * speed + Velocity.y[pid] * VELOCITY_INHERIT

                const life = PARTICLE_LIFE_MIN + Math.random() * (PARTICLE_LIFE_MAX - PARTICLE_LIFE_MIN)
                pool.life[slot] = life
                pool.maxLife[slot] = life

                pool.size[slot] = SIZE_MIN + Math.random() * (SIZE_MAX - SIZE_MIN)
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

            // drag: particles slow down and clump instead of stringing out in a line
            pool.vx[i] *= PARTICLE_DRAG
            pool.vy[i] *= PARTICLE_DRAG

            pool.x[i] += pool.vx[i] * delta
            pool.y[i] += pool.vy[i] * delta

            const t = Math.max(0, pool.life[i] / pool.maxLife[i])   // 1 -> 0

            // eased falloff: holds size briefly then shrinks fast (spark snap, not linear fade)
            const eased = t * t
            const s = pool.size[i] * eased

            _position.set(pool.x[i], pool.y[i], 0)
            _scale.set(s, s, s)
            _matrix.compose(_position, _rotation, _scale)
            mesh.setMatrixAt(i, _matrix)

            // hot white-cyan at birth, cooling to deep blue and darkening as it dies
            _color.setHSL(0.55 - 0.05 * (1 - t), 1, 0.35 + 0.5 * eased)
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
                color="#88eeff"
                transparent
                opacity={0.85}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </instancedMesh>
    )
}