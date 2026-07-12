// src/renderers/StarfieldRenderer.jsx

import { useMemo } from "react"
import { useThree } from "@react-three/fiber"
import * as THREE from "three"

const STAR_COUNT = 1200
const STAR_Z = -5
const PADDING = 1.4 // extra margin so stars still cover the screen after resize/panning

export function StarfieldRenderer() {
    const viewport = useThree((state) => state.viewport)

    const { geometry, material } = useMemo(() => {
        const fieldWidth = viewport.width * PADDING
        const fieldHeight = viewport.height * PADDING

        const positions = new Float32Array(STAR_COUNT * 3)
        for (let i = 0; i < STAR_COUNT; i++) {
            positions[i * 3 + 0] = (Math.random() - 0.5) * fieldWidth
            positions[i * 3 + 1] = (Math.random() - 0.5) * fieldHeight
            positions[i * 3 + 2] = STAR_Z
        }

        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))

        const material = new THREE.PointsMaterial({
            color: "#ffffff",
            size: 0.15,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
        })

        return { geometry, material }
    }, [viewport.width, viewport.height])

    return (
        <points geometry={geometry} material={material} frustumCulled={false} />
    )
}