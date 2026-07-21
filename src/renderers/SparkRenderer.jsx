// src/renderers/SparkRenderer.jsx

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { particles, updateSparkEmitter } from "../effects/gpu/SparkEmitter.js"

const MAX_SPARKS = 700

const _matrix = new THREE.Matrix4()
const _position = new THREE.Vector3()
const _rotation = new THREE.Quaternion()
const _scale = new THREE.Vector3()

export function SparkRenderer() {

    const coreRef = useRef()
    const emberRef = useRef()
    const geometry = useMemo(() => new THREE.SphereGeometry(0.5, 5, 5), [])

    useFrame((_, dt) => {

        const core = coreRef.current
        const ember = emberRef.current

        if (!core || !ember)
            return

        let rendered = 0
        let coreIdx = 0
        let emberIdx = 0

        for (let i = 0; i < particles.length; i++) {

            if (rendered >= MAX_SPARKS)
                break

            const p = particles[i]

            if (!p.alive)
                continue

            rendered++

            const t = p.maxLife > 0
                ? Math.max(0, p.life / p.maxLife)
                : 0

            const s = Math.max(0.001, p.size * t)

            _position.set(p.x, p.y, 0.5)
            _scale.set(s, s, s)
            _matrix.compose(_position, _rotation, _scale)

            if (t > 0.5) {
                core.setMatrixAt(coreIdx++, _matrix)
            } else {
                ember.setMatrixAt(emberIdx++, _matrix)
            }

        }

        core.count = coreIdx
        ember.count = emberIdx

        core.instanceMatrix.needsUpdate = true
        ember.instanceMatrix.needsUpdate = true

    })

    return (
        <>
            <instancedMesh
                ref={emberRef}
                args={[null, null, MAX_SPARKS]}
                frustumCulled={false}
            >
                <primitive
                    object={geometry}
                    attach="geometry"
                />

                <meshBasicMaterial
                    color="#ff5522"
                    transparent
                    opacity={0.85}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </instancedMesh>

            <instancedMesh
                ref={coreRef}
                args={[null, null, MAX_SPARKS]}
                frustumCulled={false}
            >
                <primitive
                    object={geometry}
                    attach="geometry"
                />

                <meshBasicMaterial
                    color="#fff2b0"
                    transparent
                    opacity={0.95}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </instancedMesh>
        </>
    )

}