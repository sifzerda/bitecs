//src/renderers/ExhaustRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { playerQuery, exhaustQuery } from '../ecs/constants/queries.js'
import { Position, Rotation, Velocity } from '../ecs/constants/components.js'
import { input } from '../ecs/systems/input.js'

const MAX_PARTICLES = 60
const EMIT_PER_FRAME = 2
const PARTICLE_LIFE_MIN = 0.15
const PARTICLE_LIFE_MAX = 0.3
const SPEED_MIN = 1.5
const SPEED_MAX = 3.0
const CONE_ANGLE = 0.35
const PARTICLE_DRAG = 0.92
const VELOCITY_INHERIT = 0.05
const SIZE_MIN = 0.08
const SIZE_MAX = 0.18

const _matrix = new THREE.Matrix4()
const _position = new THREE.Vector3()
const _rotation = new THREE.Quaternion()
const _scale = new THREE.Vector3()
const _scaleZero = new THREE.Vector3(0, 0, 0)
const _color = new THREE.Color()

export function ExhaustRenderer() {

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
        const exhausts = exhaustQuery()

        // -------------------------
        // Emit new particles while thrusting (and not boosting —
        // BoostRenderer takes over the visual during a boost window)
        // -------------------------

        if (input.thrust && players.length > 0) {

            const pid = players[0]

            const facingAngle = Math.atan2(Math.sin(-Rotation[pid]), Math.cos(-Rotation[pid]))

            for (let n = 0; n < EMIT_PER_FRAME; n++) {

                const slot = pool.cursor
                pool.cursor = (pool.cursor + 1) % MAX_PARTICLES

                const angle = facingAngle + Math.PI + (Math.random() - 0.5) * CONE_ANGLE
                const speed = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN)

                const dirX = Math.cos(angle)
                const dirY = Math.sin(angle)

                pool.x[slot] = Position.x[pid] - Math.sin(-Rotation[pid]) * 0.35
                pool.y[slot] = Position.y[pid] - Math.cos(-Rotation[pid]) * 0.35

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

            pool.vx[i] *= PARTICLE_DRAG
            pool.vy[i] *= PARTICLE_DRAG

            pool.x[i] += pool.vx[i] * delta
            pool.y[i] += pool.vy[i] * delta

            const t = Math.max(0, pool.life[i] / pool.maxLife[i])
            const eased = t * t
            const s = pool.size[i] * eased

            _position.set(pool.x[i], pool.y[i], 0)
            _scale.set(s, s, s)
            _matrix.compose(_position, _rotation, _scale)
            mesh.setMatrixAt(i, _matrix)

            // hot yellow-white core cooling to orange/red as it dies
            _color.setHSL(0.11 - 0.08 * (1 - t), 1, 0.4 + 0.4 * eased)
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
            <sphereGeometry args={[0.4, 6, 6]} />
            <meshBasicMaterial
                color="#ffaa33"
                transparent
                opacity={0.85}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </instancedMesh>
    )
}