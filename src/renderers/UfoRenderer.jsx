// src/renderers/UfoRenderer.jsx

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ufoQuery } from '../ecs/constants/queries'
import { Position } from '../ecs/components'

const MAX_UFOS = 4 // generous headroom, only ever expect 1 at a time for now

export function UfoRenderer() {
    const meshRef = useRef()
    const dummy = useRef(new THREE.Object3D()).current

    useFrame(() => {
        const ufos = ufoQuery()
        const mesh = meshRef.current
        if (!mesh) return

        for (let i = 0; i < ufos.length; i++) {
            const id = ufos[i]

            dummy.position.set(Position.x[id], Position.y[id], 0)
            dummy.rotation.set(0, 0, 0)
            dummy.scale.setScalar(1.4) // bigger than a regular asteroid, reads as "boss"
            dummy.updateMatrix()

            mesh.setMatrixAt(i, dummy.matrix)
        }

        mesh.count = ufos.length
        mesh.instanceMatrix.needsUpdate = true
    })

    return (
        <instancedMesh ref={meshRef} args={[null, null, MAX_UFOS]}>
            {/* Placeholder geometry — swap for a proper UFO mesh/model later */}
            <capsuleGeometry args={[0.6, 0.3, 4, 8]} />
            <meshStandardMaterial
                color="#7CFC00"
                emissive="#39FF14"
                emissiveIntensity={0.8}
                metalness={0.6}
                roughness={0.3}
            />
        </instancedMesh>
    )
}