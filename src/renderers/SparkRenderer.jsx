// src/renderers/SparkRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { activeSparks } from '../ecs/pools/sparkPool.js'
import { Position, Spark, Lifetime } from '../ecs/constants/components.js'

const MAX_SPARKS = 700

const _matrix = new THREE.Matrix4()
const _position = new THREE.Vector3()
const _rotationIdentity = new THREE.Quaternion()
const _scale = new THREE.Vector3()
const _scaleZero = new THREE.Vector3(0, 0, 0)

export function SparkRenderer() {

    const coreRef = useRef()
    const emberRef = useRef()
    const geometry = useMemo(() => new THREE.SphereGeometry(0.5, 5, 5), [])

    useFrame(() => {

        const core = coreRef.current
        const ember = emberRef.current
        if (!core || !ember) return

        const count = Math.min(activeSparks.length, MAX_SPARKS)

        let coreIdx = 0
        let emberIdx = 0

        for (let i = 0; i < count; i++) {

            const id = activeSparks[i]

            const maxLife = Spark.maxLife[id]
            const t = maxLife > 0
                ? Math.max(0, Lifetime.remaining[id] / maxLife)
                : 0

            const baseSize = Spark.size[id] > 0
                ? Spark.size[id]
                : 0.15

            const s = baseSize * t

            _position.set(Position.x[id], Position.y[id], 0.5)
            _scale.set(s, s, s)

            _matrix.compose(_position, _rotationIdentity, _scale)

            if (t > 0.5) {
                core.setMatrixAt(coreIdx++, _matrix)
            } else {
                ember.setMatrixAt(emberIdx++, _matrix)
            }
        }

        core.instanceMatrix.needsUpdate = true
        core.count = coreIdx

        ember.instanceMatrix.needsUpdate = true
        ember.count = emberIdx
    })

    return (
        <>
            {/* Cooling embers — orange/red, older sparks */}
            <instancedMesh ref={emberRef} args={[null, null, MAX_SPARKS]} frustumCulled={false}>
                <primitive object={geometry} attach="geometry" />
                <meshBasicMaterial
                    color="#ff5522"
                    transparent
                    opacity={0.85}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </instancedMesh>

            {/* Hot core — white/yellow, young sparks */}
            <instancedMesh ref={coreRef} args={[null, null, MAX_SPARKS]} frustumCulled={false}>
                <primitive object={geometry} attach="geometry" />
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