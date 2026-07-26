// src/renderers/ArcRenderer.jsx
// Renders chain-lightning bolts pushed via arcState.pushArc — used by the
// arc gun's beam chain and the bullet-based chainLightning effect.

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { arcState } from '../state/arcState.js'

const MAX_ARCS = 24
const MAX_POINTS_PER_ARC = 64 // generous headroom over JITTER_SEGMENTS * chainCount

export function ArcRenderer() {

    const groupRef = useRef()

    // pre-allocate a fixed pool of Line objects, each with a resizable
    // position buffer — avoids per-frame allocation while arc count/length varies
    const lines = useMemo(() => {

        const pool = []

        for (let i = 0; i < MAX_ARCS; i++) {

            const geometry = new THREE.BufferGeometry()
            const positions = new Float32Array(MAX_POINTS_PER_ARC * 3)
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
            geometry.setDrawRange(0, 0)

            const material = new THREE.LineBasicMaterial({
                color: '#1F51FF',
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                depthTest: false,
                toneMapped: false,
            })

            const line = new THREE.Line(geometry, material)
            line.frustumCulled = false
            pool.push(line)
        }

        return pool

    }, [])

    useFrame(() => {

        const arcs = arcState.arcs

        for (let i = 0; i < MAX_ARCS; i++) {

            const line = lines[i]
            const arc = arcs[i]

            if (!arc) {
                line.visible = false
                continue
            }

            line.visible = true

            const pts = arc.points
            const count = Math.min(pts.length, MAX_POINTS_PER_ARC)

            const posAttr = line.geometry.getAttribute('position')
            const arr = posAttr.array

            for (let p = 0; p < count; p++) {
                arr[p * 3] = pts[p].x
                arr[p * 3 + 1] = pts[p].y
                arr[p * 3 + 2] = 0.03
            }

            posAttr.needsUpdate = true
            line.geometry.setDrawRange(0, count)
            line.geometry.computeBoundingSphere()

            // fade out over remaining life; slight flicker so it reads as "live" current
            const t = Math.max(0, arc.life / arc.maxLife)
            const flicker = 0.8 + Math.random() * 0.2
            line.material.opacity = t * flicker
            line.material.color.set(arc.color)
        }
    })

    return (
        <group ref={groupRef}>
            {lines.map((line, i) => (
                <primitive key={i} object={line} />
            ))}
        </group>
    )
}