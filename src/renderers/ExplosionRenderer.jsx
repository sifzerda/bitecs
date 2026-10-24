//src/renderers/ExplosionRenderer.jsx

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { explosionPool as p } from "../fx/gpu/ExplosionEmitter"

export function ExplosionRenderer() {

    const ref = useRef()
    const dummy = useMemo(() => new THREE.Object3D(), [])
    const color = useMemo(() => new THREE.Color(), [])

    useFrame(() => {

        const mesh = ref.current; if (!mesh) return
        mesh.count = p.activeCount
        for (let n = 0; n < p.activeCount; n++) {

            const id = p.activeIds[n]
            const j = id * 3
            const t = p.age[id]

            dummy.position.fromArray(p.instancePosition, j)
            dummy.scale.setScalar(p.instanceScale[id] * Math.max(0, 1 - t))
            dummy.rotation.set(p.rotAngle[id], p.rotAngle[id] * 0.7, 0)
            dummy.updateMatrix(); mesh.setMatrixAt(n, dummy.matrix)
            color.setRGB(1, Math.max(0.04, 0.9 - t), Math.max(0.01, 0.45 - t))
            mesh.setColorAt(n, color)
        }

        if (p.activeCount) {
            mesh.instanceMatrix.needsUpdate = true;
            mesh.instanceColor.needsUpdate = true
        }
    })

    return (
        <instancedMesh ref={ref} args={[null, null, p.capacity]} count={0} frustumCulled={false}>
            <icosahedronGeometry args={[1, 1]} />
            <meshBasicMaterial transparent opacity={0.75} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
        </instancedMesh>
    )
}
