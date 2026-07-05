// src/renderers/ArcRenderer.jsx

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { arcState } from '../state/arcState.js'

const MAX_ARCS = 8            // generous cap on simultaneous fading arcs
const SEGMENTS_PER_JUMP = 3   // small jagged kinks per point-to-point jump, for a lightning look
const JITTER = 0.15

const _color = new THREE.Color()

export function ArcRenderer() {

    const groupRef = useRef()
    const lineRefs = useRef(Array.from({ length: MAX_ARCS }, () => null))

    useFrame((_, delta) => {

        // age + prune expired arcs
        for (let i = arcState.arcs.length - 1; i >= 0; i--) {
            arcState.arcs[i].life -= delta
            if (arcState.arcs[i].life <= 0) arcState.arcs.splice(i, 1)
        }

        const group = groupRef.current
        if (!group) return

        for (let slot = 0; slot < MAX_ARCS; slot++) {

            const line = lineRefs.current[slot]
            const arc = arcState.arcs[slot]

            if (!line) continue

            if (!arc) {
                line.visible = false
                continue
            }

            line.visible = true

            // build a jittered polyline between each pair of chain points
            const positions = []
            for (let p = 0; p < arc.points.length - 1; p++) {

                const a = arc.points[p]
                const b = arc.points[p + 1]

                positions.push(a.x, a.y, 0.03)

                for (let s = 1; s < SEGMENTS_PER_JUMP; s++) {
                    const t = s / SEGMENTS_PER_JUMP
                    const jx = (Math.random() - 0.5) * JITTER
                    const jy = (Math.random() - 0.5) * JITTER
                    positions.push(
                        a.x + (b.x - a.x) * t + jx,
                        a.y + (b.y - a.y) * t + jy,
                        0.03
                    )
                }
            }

            const last = arc.points[arc.points.length - 1]
            positions.push(last.x, last.y, 0.03)

            line.geometry.setAttribute(
                'position',
                new THREE.Float32BufferAttribute(positions, 3)
            )
            line.geometry.attributes.position.needsUpdate = true
            line.geometry.computeBoundingSphere()

            const t = arc.life / arc.maxLife
            line.material.opacity = t
        }
    })

    return (
        <group ref={groupRef}>
            {Array.from({ length: MAX_ARCS }).map((_, i) => (
                <line
                    key={i}
                    ref={(el) => (lineRefs.current[i] = el)}
                    frustumCulled={false}
                >
                    <bufferGeometry />
                    <lineBasicMaterial
                        color="#9966ff"
                        transparent
                        opacity={1}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                    />
                </line>
            ))}
        </group>
    )
}