// src/renderers/SparkRenderer.jsx

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { sparkPool, updateSparkEmitter } from "../effects/gpu/SparkEmitter.js"

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

        updateSparkEmitter(dt)

        const core = coreRef.current
        const ember = emberRef.current

        if (!core || !ember)
            return

        const p = sparkPool

        let rendered = 0
        let coreIdx = 0
        let emberIdx = 0

        for (let i = 0; i < p.capacity; i++) {

            if (rendered >= MAX_SPARKS)
                break

            if (!p.alive[i])
                continue

            rendered++

            const t =
                p.maxLife[i] > 0
                    ? p.life[i] / p.maxLife[i]
                    : 0

            const s =
                Math.max(
                    0.001,
                    p.size[i] * t
                )

            _position.set(
                p.x[i],
                p.y[i],
                0.5
            )

            _scale.set(
                s,
                s,
                s
            )

            _matrix.compose(
                _position,
                _rotation,
                _scale
            )

            if (p.hot[i]) {

                core.setMatrixAt(
                    coreIdx++,
                    _matrix
                )

            } else {

                ember.setMatrixAt(
                    emberIdx++,
                    _matrix
                )

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