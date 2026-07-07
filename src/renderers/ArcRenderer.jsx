// src/renderers/ArcRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { arcState } from '../state/arcState.js'

const MAX_ARCS = 8              // generous cap on simultaneous fading arcs
const MAX_POINTS_PER_ARC = 10   // safety cap on chain-lightning jump count
const SEGMENTS_PER_JUMP = 3     // small jagged kinks per point-to-point jump
const JITTER = 0.15
const HALF_WIDTH = 0.22         // ribbon half-width (glow can extend to this edge)

const MAX_SEGMENTS = MAX_ARCS * (MAX_POINTS_PER_ARC - 1) * SEGMENTS_PER_JUMP
const VERTS_PER_SEG = 4
const MAX_VERTS = MAX_SEGMENTS * VERTS_PER_SEG

const _tmpColor = new THREE.Color()

export function ArcRenderer() {

    const meshRef = useRef()

    const geometry = useMemo(() => {

        const geo = new THREE.BufferGeometry()

        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_VERTS * 3), 3))
        geo.setAttribute('aUv', new THREE.BufferAttribute(new Float32Array(MAX_VERTS * 2), 2))
        geo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(MAX_VERTS * 3), 3))
        geo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(MAX_VERTS), 1))
        geo.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(MAX_VERTS), 1))

        // static index pattern for MAX_SEGMENTS quads, precomputed once
        const indices = new Uint32Array(MAX_SEGMENTS * 6)
        for (let i = 0; i < MAX_SEGMENTS; i++) {
            const base = i * 4
            const o = i * 6
            indices[o] = base
            indices[o + 1] = base + 1
            indices[o + 2] = base + 2
            indices[o + 3] = base
            indices[o + 4] = base + 2
            indices[o + 5] = base + 3
        }
        geo.setIndex(new THREE.BufferAttribute(indices, 1))
        geo.setDrawRange(0, 0)

        return geo

    }, [])

    const material = useMemo(() => {

        return new THREE.ShaderMaterial({

            transparent: true,
            depthWrite: false,
            depthTest: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
            uniforms: { uTime: { value: 0 } },

            vertexShader: /* glsl */`
attribute vec2 aUv;
attribute vec3 aColor;
attribute float aAlpha;
attribute float aSeed;

varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;
varying float vSeed;

void main(){
    vUv = aUv;
    vColor = aColor;
    vAlpha = aAlpha;
    vSeed = aSeed;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,

            fragmentShader: /* glsl */`
precision highp float;
uniform float uTime;

varying vec2 vUv;      // x: -1..1 across width, y: 0..1 along the bolt
varying vec3 vColor;
varying float vAlpha;
varying float vSeed;

void main(){

    float w = abs(vUv.x);

    // core / mid / outer falloff across the ribbon width
    float core  = 1.0 - smoothstep(0.0, 0.12, w);
    float mid   = exp(-w * 4.0);
    float outer = exp(-w * 1.6);

    // crackly flicker traveling along the bolt, unique per-arc via vSeed
    float flicker = 0.6
        + 0.25 * sin(uTime * 45.0 + vSeed * 17.0 + vUv.y * 30.0)
        + 0.15 * sin(uTime * 97.0 + vSeed * 41.0 + vUv.y * 65.0);
    flicker = clamp(flicker, 0.0, 1.4);

    vec3 hot = vec3(1.0);   // white-hot electric core

    vec3 color =
          hot   * core  * 1.6
        + vColor * core  * 0.5
        + vColor * mid   * 1.1
        + vColor * outer * 0.5;

    color *= flicker;

    float alpha = clamp(core * 1.0 + mid * 0.7 + outer * 0.4, 0.0, 1.0) * vAlpha * flicker;

    gl_FragColor = vec4(color, alpha);
}
`
        });

    }, []);

    useFrame((state, delta) => {

        material.uniforms.uTime.value = state.clock.elapsedTime

        // age + prune expired arcs
        for (let i = arcState.arcs.length - 1; i >= 0; i--) {
            arcState.arcs[i].life -= delta
            if (arcState.arcs[i].life <= 0) arcState.arcs.splice(i, 1)
        }

        const posAttr = geometry.attributes.position
        const uvAttr = geometry.attributes.aUv
        const colorAttr = geometry.attributes.aColor
        const alphaAttr = geometry.attributes.aAlpha
        const seedAttr = geometry.attributes.aSeed

        let vertCursor = 0
        let segCursor = 0

        for (let slot = 0; slot < MAX_ARCS; slot++) {

            const arc = arcState.arcs[slot]
            if (!arc) continue

            const t = Math.max(arc.life / arc.maxLife, 0)

            // build jittered polyline (same jagged-jump logic as before)
            const srcPoints = arc.points.slice(0, MAX_POINTS_PER_ARC)
            const path = []

            for (let p = 0; p < srcPoints.length - 1; p++) {

                const a = srcPoints[p]
                const b = srcPoints[p + 1]

                path.push({ x: a.x, y: a.y })

                for (let s = 1; s < SEGMENTS_PER_JUMP; s++) {
                    const f = s / SEGMENTS_PER_JUMP
                    const jx = (Math.random() - 0.5) * JITTER
                    const jy = (Math.random() - 0.5) * JITTER
                    path.push({
                        x: a.x + (b.x - a.x) * f + jx,
                        y: a.y + (b.y - a.y) * f + jy,
                    })
                }
            }

            const lastPt = srcPoints[srcPoints.length - 1]
            if (lastPt) path.push({ x: lastPt.x, y: lastPt.y })

            _tmpColor.set(arc.color ?? '#9966ff')
            const totalSegs = Math.max(path.length - 1, 1)
            const seed = slot * 7.3 + 1.0

            for (let p = 0; p < path.length - 1 && segCursor < MAX_SEGMENTS; p++) {

                const a = path[p]
                const b = path[p + 1]

                const dx = b.x - a.x
                const dy = b.y - a.y
                const len = Math.hypot(dx, dy) || 0.0001

                const nx = (-dy / len) * HALF_WIDTH
                const ny = (dx / len) * HALF_WIDTH

                const u0 = p / totalSegs
                const u1 = (p + 1) / totalSegs

                // 4 corners: a-n, a+n, b+n, b-n
                const corners = [
                    [a.x - nx, a.y - ny, -1, u0],
                    [a.x + nx, a.y + ny, 1, u0],
                    [b.x + nx, b.y + ny, 1, u1],
                    [b.x - nx, b.y - ny, -1, u1],
                ]

                for (let k = 0; k < 4; k++) {

                    const vi = vertCursor + k
                    const [x, y, side, along] = corners[k]

                    posAttr.array[vi * 3] = x
                    posAttr.array[vi * 3 + 1] = y
                    posAttr.array[vi * 3 + 2] = 0.03

                    uvAttr.array[vi * 2] = side
                    uvAttr.array[vi * 2 + 1] = along

                    colorAttr.array[vi * 3] = _tmpColor.r
                    colorAttr.array[vi * 3 + 1] = _tmpColor.g
                    colorAttr.array[vi * 3 + 2] = _tmpColor.b

                    alphaAttr.array[vi] = t
                    seedAttr.array[vi] = seed
                }

                vertCursor += 4
                segCursor += 1
            }
        }

        posAttr.needsUpdate = true
        uvAttr.needsUpdate = true
        colorAttr.needsUpdate = true
        alphaAttr.needsUpdate = true
        seedAttr.needsUpdate = true

        geometry.setDrawRange(0, segCursor * 6)

    })

    return (
        <mesh
            ref={meshRef}
            geometry={geometry}
            material={material}
            frustumCulled={false}
        />
    )
}