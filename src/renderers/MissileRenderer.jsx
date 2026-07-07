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

const MAX_SMOKE = 200
const SMOKE_PER_MISSILE_PER_FRAME = 1
const SMOKE_LIFE = 0.4
const SMOKE_SIZE_MIN = 0.12
const SMOKE_SIZE_MAX = 0.24

const _matrix = new THREE.Matrix4()
const _position = new THREE.Vector3()
const _rotation = new THREE.Quaternion()
const _scale = new THREE.Vector3()
const _scaleZero = new THREE.Vector3(0, 0, 0)
const _euler = new THREE.Euler()

const _smokeMatrix = new THREE.Matrix4()
const _smokePosition = new THREE.Vector3()
const _smokeScale = new THREE.Vector3()
const _smokeColor = new THREE.Color()
const _smokeRotation = new THREE.Quaternion()

export function MissileRenderer() {

    const bodyRef = useRef()
    const flameRef = useRef()
    const smokeRef = useRef()

    const bodyGeometry = useMemo(() => new THREE.CapsuleGeometry(BODY_WIDTH, BODY_LENGTH, 2, 6), [])
    const flameGeometry = useMemo(() => new THREE.SphereGeometry(FLAME_SIZE, 6, 6), [])
    const smokeGeometry = useMemo(() => new THREE.SphereGeometry(0.5, 5, 5), [])

    const smokePool = useMemo(() => ({
        x: new Float32Array(MAX_SMOKE),
        y: new Float32Array(MAX_SMOKE),
        life: new Float32Array(MAX_SMOKE),
        maxLife: new Float32Array(MAX_SMOKE),
        size: new Float32Array(MAX_SMOKE),
        cursor: 0,
    }), [])

    useFrame((_, delta) => {

        const body = bodyRef.current
        const flame = flameRef.current
        const smoke = smokeRef.current
        if (!body || !flame || !smoke) return

        const weapon = getWeapon(3)
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

            // -------------------------
            // Drop smoke behind the missile
            // -------------------------

            for (let n = 0; n < SMOKE_PER_MISSILE_PER_FRAME; n++) {

                const slot = smokePool.cursor
                smokePool.cursor = (smokePool.cursor + 1) % MAX_SMOKE

                smokePool.x[slot] = Position.x[eid] + backX
                smokePool.y[slot] = Position.y[eid] + backY
                smokePool.life[slot] = SMOKE_LIFE
                smokePool.maxLife[slot] = SMOKE_LIFE
                smokePool.size[slot] = SMOKE_SIZE_MIN + Math.random() * (SMOKE_SIZE_MAX - SMOKE_SIZE_MIN)
            }
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

        // -------------------------
        // Update + draw smoke trail
        // -------------------------

        for (let i = 0; i < MAX_SMOKE; i++) {

            if (smokePool.life[i] <= 0) {
                _smokeMatrix.compose(_smokePosition.set(0, 0, 0), _smokeRotation, _scaleZero)
                smoke.setMatrixAt(i, _smokeMatrix)
                continue
            }

            smokePool.life[i] -= delta

            const t = Math.max(0, smokePool.life[i] / smokePool.maxLife[i])
            const s = smokePool.size[i] * (1.2 - t)   // smoke grows slightly as it dissipates

            _smokePosition.set(smokePool.x[i], smokePool.y[i], -0.01)
            _smokeScale.set(s, s, s)
            _smokeMatrix.compose(_smokePosition, _smokeRotation, _smokeScale)
            smoke.setMatrixAt(i, _smokeMatrix)
        }

        smoke.instanceMatrix.needsUpdate = true
        smoke.count = MAX_SMOKE

    })

    return (
        <>
            <instancedMesh ref={smokeRef} args={[null, null, MAX_SMOKE]} frustumCulled={false}>
                <primitive object={smokeGeometry} attach="geometry" />
                <meshBasicMaterial
                    color="#7DF9FF"
                    transparent
                    opacity={0.3}
                    depthWrite={false}
                />
            </instancedMesh>

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