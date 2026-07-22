// src/renderers/TrailRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Position, Velocity, Bullet } from '../ecs/constants/components.js'
import { WEAPONS } from '../ecs/constants/weapons.js'
import { activeBullets } from '../ecs/pools/bulletPool.js'
import { trailPuffs, spawnTrailPuff, updateTrailEmitter } from '../effects/gpu/TrailEmitter.js'

const MAX_TRAIL = 400
const TRAIL_BACK_OFFSET = 0.35   // how far behind the bullet's tail a puff spawns
const TRAIL_SIZE_MIN = 0.14
const TRAIL_SIZE_MAX = 0.26
const TRAIL_LIFE = 0.4

const matrix = new THREE.Matrix4()
const pos = new THREE.Vector3()
const scaleVec = new THREE.Vector3()
const scaleZero = new THREE.Vector3(0, 0, 0)
const rot = new THREE.Quaternion()
const color = new THREE.Color()

export function TrailRenderer() {

    const meshRef = useRef()
    const geometry = useMemo(() => new THREE.SphereGeometry(0.5, 5, 5), [])

    const material = useMemo(() => new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        vertexColors: true,
    }), [])

    // per-instance color buffer, since different weapons have different trail colors
    const instanceColor = useMemo(() => {
        const arr = new Float32Array(MAX_TRAIL * 3)
        return new THREE.InstancedBufferAttribute(arr, 3)
    }, [])

    useFrame((_, dt) => {

        const mesh = meshRef.current
        if (!mesh) return

        // -------------------------
        // Spawn: walk live bullets, drop a puff behind any trailing weapon
        // -------------------------

        for (let i = 0; i < activeBullets.length; i++) {

            const eid = activeBullets[i]
            const weapon = WEAPONS[Bullet.type[eid]]

            if (!weapon || !weapon.trail)
                continue

            const vx = Velocity.x[eid]
            const vy = Velocity.y[eid]
            const speed = Math.hypot(vx, vy) || 1

            const backX = -(vx / speed) * TRAIL_BACK_OFFSET
            const backY = -(vy / speed) * TRAIL_BACK_OFFSET

            color.set(weapon.trailColor ?? weapon.glowColor ?? "#888888")

            spawnTrailPuff({
                x: Position.x[eid] + backX,
                y: Position.y[eid] + backY,
                size: TRAIL_SIZE_MIN + Math.random() * (TRAIL_SIZE_MAX - TRAIL_SIZE_MIN),
                maxLife: TRAIL_LIFE,
                r: color.r, g: color.g, b: color.b,
            })

        }

        // -------------------------
        // Update + draw the shared puff pool
        // -------------------------

        updateTrailEmitter(dt)

        for (let i = 0; i < MAX_TRAIL; i++) {

            const p = trailPuffs[i]

            if (!p.alive) {
                matrix.compose(pos.set(0, 0, 0), rot, scaleZero)
                mesh.setMatrixAt(i, matrix)
                continue
            }

            const t = Math.max(0, p.life / p.maxLife)
            const s = p.size * (1.2 - t)   // grows slightly as it fades, like dissipating smoke

            pos.set(p.x, p.y, -0.01)
            scaleVec.set(s, s, s)
            matrix.compose(pos, rot, scaleVec)
            mesh.setMatrixAt(i, matrix)

            const cIdx = i * 3
            instanceColor.array[cIdx] = p.r
            instanceColor.array[cIdx + 1] = p.g
            instanceColor.array[cIdx + 2] = p.b

            // fade opacity is per-instance-alpha which InstancedMesh/MeshBasicMaterial
            // doesn't support directly, so color is dimmed toward black as a stand-in fade
            instanceColor.array[cIdx] *= t
            instanceColor.array[cIdx + 1] *= t
            instanceColor.array[cIdx + 2] *= t

        }

        mesh.instanceMatrix.needsUpdate = true
        mesh.count = MAX_TRAIL
        instanceColor.needsUpdate = true

    })

    return (
        <instancedMesh
            ref={meshRef}
            args={[geometry, material, MAX_TRAIL]}
            frustumCulled={false}
        >
            <primitive object={instanceColor} attach="instanceColor" />
        </instancedMesh>
    )

}