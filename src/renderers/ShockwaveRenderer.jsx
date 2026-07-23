//src/renderers/ShockwaveRenderer.jsx

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"
import { shockwavePool, updateShockwaveEmitter } from "../fx/gpu/ShockwaveEmitter"

const MAX = 64

export function ShockwaveRenderer() {

    const ref = useRef()
    const geo = useMemo(() => new THREE.RingGeometry(0.8, 1, 32), [])

    useFrame((_, dt) => {

        updateShockwaveEmitter(dt)

        const p = shockwavePool

        let count = 0

        const matrix = new THREE.Matrix4()
        const pos = new THREE.Vector3()
        const scale = new THREE.Vector3()
        const rot = new THREE.Quaternion()

        for (let i = 0; i < p.capacity; i++) {

            if (!p.alive[i])
                continue

            const t = 1 - p.life[i] / p.maxLife[i]
            const radius = p.radius[i] * (1 + t * 5)

            pos.set(p.x[i], p.y[i], 0.05)
            scale.set(radius, radius, 1)
            matrix.compose(pos, rot, scale)
            ref.current.setMatrixAt(count++, matrix)

        }

        ref.current.count = count
        ref.current.instanceMatrix.needsUpdate = true

    })

    return (
        <instancedMesh ref={ref} args={[geo, null, MAX]} frustumCulled={false}>
            <meshBasicMaterial color="#88ddff" transparent opacity={0.3} depthWrite={false} />
        </instancedMesh>
    )

}