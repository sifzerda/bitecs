//src/renderers/ExplosionRenderer.jsx

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

import {
    explosions,
    updateExplosionEmitter,
}
from "../effects/gpu/ExplosionEmitter"

const MAX = 512

const matrix = new THREE.Matrix4()
const pos = new THREE.Vector3()
const scale = new THREE.Vector3()
const rot = new THREE.Quaternion()

export function ExplosionRenderer() {

    const ref = useRef()

    const geo = useMemo(
        () => new THREE.SphereGeometry(1, 8, 8),
        []
    )

    useFrame((_, dt) => {

        updateExplosionEmitter(dt)

        let count = 0

        for (const e of explosions) {

            if (!e.alive)
                continue

            const t =
                e.life /
                e.maxLife

            const s =
                e.size *
                (2.5 - t)

            pos.set(
                e.x,
                e.y,
                0.2
            )

            scale.set(
                s,
                s,
                s
            )

            matrix.compose(
                pos,
                rot,
                scale
            )

            ref.current.setMatrixAt(
                count++,
                matrix
            )

        }

        ref.current.count = count
        ref.current.instanceMatrix.needsUpdate = true

    })

    return (
        <instancedMesh
            ref={ref}
            args={[null, null, MAX]}
            frustumCulled={false}
        >
            <primitive
                object={geo}
                attach="geometry"
            />

            <meshBasicMaterial
                color="#ff8822"
                transparent
                opacity={0.8}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </instancedMesh>
    )

}