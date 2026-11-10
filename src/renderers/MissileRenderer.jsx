// src/renderers/MissileRenderer.jsx

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

import { activeBullets } from "../ecs/pools/bulletPool.js"

import {
    Position,
    Velocity,
    Bullet,
} from "../ecs/constants/components.js"

import { getWeapon } from "../ecs/weapons/config/weapons.js"

const CAPACITY = 2000
const HALF_PI = Math.PI / 2

export function MissileRenderer() {
    const meshRef = useRef(null)

    const dummy = useMemo(
        () => new THREE.Object3D(),
        []
    )

    useFrame(() => {
        const mesh = meshRef.current
        if (!mesh) return

        let count = 0

        for (
            let i = 0;
            i < activeBullets.length && count < CAPACITY;
            i++
        ) {
            const id = activeBullets[i]
            const weapon = getWeapon(Bullet.type[id])

            if (!weapon?.homing) continue

            const vx = Velocity.x[id]
            const vy = Velocity.y[id]

            dummy.position.set(
                Position.x[id],
                Position.y[id],
                0
            )

            if (vx * vx + vy * vy > 1e-8) {
                dummy.rotation.z =
                    Math.atan2(vy, vx) - HALF_PI
            } else {
                dummy.rotation.z = 0
            }

            dummy.updateMatrix()
            mesh.setMatrixAt(count, dummy.matrix)

            count++
        }

        mesh.count = count

        if (count > 0) {
            mesh.instanceMatrix.needsUpdate = true
        }
    })

    return (
        <instancedMesh
            ref={meshRef}
            args={[null, null, CAPACITY]}
            count={0}
            frustumCulled={false}
        >
            <capsuleGeometry args={[0.13, 0.7, 2, 6]} />
            <meshBasicMaterial color="#ffaa00" />
        </instancedMesh>
    )
}
