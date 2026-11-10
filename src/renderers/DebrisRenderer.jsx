// src/renderers/DebrisRenderer.jsx

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

import {
    debrisPool as p,
    kind,
} from "../fx/gpu/DebrisEmitter"

const MAX_RENDER_SCALE = 0.55

function safeScale(value) {
    if (!Number.isFinite(value)) return 0

    return Math.max(
        0,
        Math.min(MAX_RENDER_SCALE, value)
    )
}

export function DebrisRenderer() {
    const ref = useRef()

    const data = useMemo(() => ({
        object: new THREE.Object3D(),
        axis: new THREE.Vector3(),
        color: new THREE.Color(),
    }), [])

    useFrame(() => {
        const mesh = ref.current

        if (!mesh) return

        const count = Math.min(
            p.activeCount,
            p.capacity
        )

        mesh.count = count

        for (let n = 0; n < count; n++) {
            const id = p.activeIds[n]
            const j = id * 3

            const x = p.instancePosition[j]
            const y = p.instancePosition[j + 1]
            const z = p.instancePosition[j + 2]

            data.object.position.set(
                Number.isFinite(x) ? x : 0,
                Number.isFinite(y) ? y : 0,
                Number.isFinite(z) ? z : 0
            )

            data.object.scale.set(
                safeScale(p.scale[j]),
                safeScale(p.scale[j + 1]),
                safeScale(p.scale[j + 2])
            )

            data.axis.fromArray(p.axis, j)

            if (
                Number.isFinite(data.axis.x) &&
                Number.isFinite(data.axis.y) &&
                Number.isFinite(data.axis.z) &&
                data.axis.lengthSq() > 1e-10
            ) {
                data.axis.normalize()

                data.object.quaternion.setFromAxisAngle(
                    data.axis,
                    Number.isFinite(p.instanceRotation[id])
                        ? p.instanceRotation[id]
                        : 0
                )
            } else {
                data.object.quaternion.identity()
            }

            data.object.updateMatrix()

            mesh.setMatrixAt(
                n,
                data.object.matrix
            )

            data.color.set(
                kind[id]
                    ? "#8993a0"
                    : "#8a6e58"
            )

            const glint = Number.isFinite(p.glint[id])
                ? Math.max(0, p.glint[id])
                : 0

            data.color.multiplyScalar(
                1 + glint * 1.5
            )

            mesh.setColorAt(n, data.color)
        }

        if (count > 0) {
            mesh.instanceMatrix.needsUpdate = true

            if (mesh.instanceColor) {
                mesh.instanceColor.needsUpdate = true
            }
        }
    })

    return (
        <instancedMesh
            ref={ref}
            args={[null, null, p.capacity]}
            count={0}
            frustumCulled={false}
        >
            <icosahedronGeometry args={[1, 0]} />

            <meshStandardMaterial
                roughness={0.65}
                metalness={0.35}
                flatShading
            />
        </instancedMesh>
    )
}
