// src/renderers/DebrisRenderer.jsx

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { debrisPool as p, kind } from "../fx/gpu/DebrisEmitter"

// -------------------------------------------------------------

export function DebrisRenderer() {

    const ref = useRef()
    const d = useMemo(() => ({

        object: new THREE.Object3D(),
        axis: new THREE.Vector3(),
        color: new THREE.Color()

    }), [])

    useFrame(() => {

        const mesh = ref.current; if (!mesh) return
        mesh.count = p.activeCount

        for (let n = 0; n < p.activeCount; n++) {

            const id = p.activeIds[n], j = id * 3

            d.object.position.fromArray(p.instancePosition, j)
            d.object.scale.fromArray(p.scale, j)

            d.axis.fromArray(p.axis, j)

            d.object.quaternion.setFromAxisAngle(d.axis, p.instanceRotation[id])
            d.object.updateMatrix(); mesh.setMatrixAt(n, d.object.matrix)

            d.color.set(kind[id] ? "#8993a0" : "#8a6e58")
            d.color.multiplyScalar(1 + (p.glint[id] || 0) * 1.5)

            mesh.setColorAt(n, d.color)
        }

        if (p.activeCount) {
            mesh.instanceMatrix.needsUpdate = true;
            mesh.instanceColor.needsUpdate = true
        }
    })

    return (
        <instancedMesh ref={ref} args={[ null, null, p.capacity ]} count={0} frustumCulled={false}>
            <icosahedronGeometry args={[ 1, 0 ]} />
            <meshStandardMaterial roughness={0.65} metalness={0.35} flatShading />
        </instancedMesh>
    )
}
