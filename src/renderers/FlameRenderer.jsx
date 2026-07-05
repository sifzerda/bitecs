// src/renderers/FlameRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { flameState } from '../state/flameState.js'
import { gameState } from '../state/gameState.js'
import { getWeapon } from '../ecs/constants/weapons.js'

const CONE_SEGMENTS = 12   // how many triangles make up the fan — higher = smoother edge
const MAX_EMBERS = 24

export function FlameRenderer() {

    const coneRef = useRef()
    const emberRef = useRef()

    const coneGeometry = useMemo(() => {

        const geometry = new THREE.BufferGeometry()
        const positions = [0, 0, 0]   // origin vertex (ship position, local space)

        // unit cone: range = 1, halfAngle = 0.5 rad — actual values applied via scale in useFrame
        const unitHalfAngle = 0.5

        for (let i = 0; i <= CONE_SEGMENTS; i++) {
            const t = i / CONE_SEGMENTS
            const angle = -unitHalfAngle + unitHalfAngle * 2 * t
            positions.push(Math.sin(angle), Math.cos(angle), 0)
        }

        const indices = []
        for (let i = 1; i < CONE_SEGMENTS + 1; i++) {
            indices.push(0, i, i + 1)
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        geometry.setIndex(indices)
        geometry.computeVertexNormals()

        return geometry

    }, [])

    const emberGeometry = useMemo(() => new THREE.SphereGeometry(0.08, 4, 4), [])

    const embers = useMemo(() => ({
        t: new Float32Array(MAX_EMBERS),      // 0-1 position along the cone's length
        offset: new Float32Array(MAX_EMBERS), // lateral jitter within the cone
        speed: new Float32Array(MAX_EMBERS),
    }), [])

    const _matrix = new THREE.Matrix4()
    const _pos = new THREE.Vector3()
    const _scale = new THREE.Vector3()
    const _quat = new THREE.Quaternion()
    const _zeroScale = new THREE.Vector3(0, 0, 0)

    useFrame((_, delta) => {

        const cone = coneRef.current
        const emberMesh = emberRef.current
        if (!cone || !emberMesh) return

        const weapon = getWeapon(gameState.currentWeapon)
        const active = weapon.category === "flame" && flameState.active

        cone.visible = active

        if (!active) {
            for (let i = 0; i < MAX_EMBERS; i++) {
                _matrix.compose(_pos.set(0, 0, 0), _quat, _zeroScale)
                emberMesh.setMatrixAt(i, _matrix)
            }
            emberMesh.instanceMatrix.needsUpdate = true
            return
        }

        // -------------------------
        // Cone stream — one flat triangle-fan mesh, scaled/rotated to match
        // the flamethrower's live range + cone angle from flameState
        // -------------------------

        const angle = Math.atan2(flameState.dirY, flameState.dirX) - Math.PI / 2
        const halfAngleRatio = flameState.coneAngle / 2 / 0.5   // scale factor vs. the unit cone's 0.5 rad

        cone.position.set(flameState.originX, flameState.originY, 0.02)
        cone.rotation.set(0, 0, angle)
        cone.scale.set(flameState.range * halfAngleRatio, flameState.range, 1)
        cone.material.color.set(weapon.glowColor)

        // -------------------------
        // Embers drifting outward along the cone, looping continuously
        // -------------------------

        for (let i = 0; i < MAX_EMBERS; i++) {

            if (embers.speed[i] === 0) {
                embers.t[i] = Math.random()
                embers.offset[i] = (Math.random() - 0.5)
                embers.speed[i] = 0.6 + Math.random() * 0.6
            }

            embers.t[i] += embers.speed[i] * delta
            if (embers.t[i] > 1) {
                embers.t[i] = 0
                embers.offset[i] = (Math.random() - 0.5)
            }

            const t = embers.t[i]
            const spread = t * (flameState.coneAngle / 2) * embers.offset[i] * 2
            const dist = t * flameState.range

            const localAngle = angle + spread
            const ex = flameState.originX + Math.sin(localAngle + Math.PI / 2) * dist
            const ey = flameState.originY + Math.cos(localAngle + Math.PI / 2) * dist

            const s = 1 - t * 0.6   // shrink slightly as they travel outward

            _matrix.compose(_pos.set(ex, ey, 0.03), _quat, _scale.set(s, s, s))
            emberMesh.setMatrixAt(i, _matrix)
        }

        emberMesh.instanceMatrix.needsUpdate = true
        emberMesh.count = MAX_EMBERS
        emberMesh.material.color.set(weapon.color)

    })

    return (
        <>
            <mesh ref={coneRef} geometry={coneGeometry} frustumCulled={false}>
                <meshBasicMaterial
                    transparent
                    opacity={0.35}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>

            <instancedMesh ref={emberRef} args={[null, null, MAX_EMBERS]} frustumCulled={false}>
                <primitive object={emberGeometry} attach="geometry" />
                <meshBasicMaterial
                    transparent
                    opacity={0.8}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </instancedMesh>
        </>
    )
}