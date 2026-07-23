// src/renderers/FireRenderer.jsx

// this is for any fire fx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { firePool } from '../fx/gpu/FireEmitter.js'

const SEGMENTS = 7

// Reduced intensity molten red fire
const hot = new THREE.Color(3.75, 1.15, 0.28)
const mid = new THREE.Color(2.8, 0.78, 0.20)
const cool = new THREE.Color(1.6, 0.22, 0.07)
const smoke = new THREE.Color(0.13, 0.11, 0.11)

const tmpColor = new THREE.Color()

export function FireRenderer() {

    const pointsRef = useRef()
    const capacity = firePool.capacity
    const totalPoints = capacity * SEGMENTS

    const geometry = useMemo(() => { const geo = new THREE.BufferGeometry()

        const positions = new Float32Array(totalPoints * 3)
        const sizes = new Float32Array(totalPoints)
        const colors = new Float32Array(totalPoints * 3)
        const alphas = new Float32Array(totalPoints)

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
        geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
        geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1))

        return geo
    }, [totalPoints])

    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            uniforms: {},
            vertexShader: /* glsl */ `
                attribute float aSize;
                attribute vec3 aColor;
                attribute float aAlpha;

                varying vec3 vColor;
                varying float vAlpha;

                void main() {
                    vColor = aColor;
                    vAlpha = aAlpha;

                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = aSize * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: /* glsl */ `
                varying vec3 vColor;
                varying float vAlpha;

                void main() {
                    vec2 uv = gl_PointCoord - 0.5;
                    float d = length(uv * vec2(1.0, 1.2));

                    float alpha = smoothstep(0.5, 0.0, d);
                    if (alpha <= 0.0) discard;

                    gl_FragColor = vec4(vColor, alpha * vAlpha);
                }
            `
        })
    }, [])

    useFrame((state) => {
        const points = pointsRef.current
        if (!points) return

        const p = firePool
        const elapsed = state.clock.elapsedTime

        const posAttr = points.geometry.attributes.position
        const sizeAttr = points.geometry.attributes.aSize
        const colorAttr = points.geometry.attributes.aColor
        const alphaAttr = points.geometry.attributes.aAlpha

        for (let i = 0; i < capacity; i++) {
            const alive = p.alive[i]
            const base = i * SEGMENTS

            if (!alive) {
                for (let s = 0; s < SEGMENTS; s++) {
                    const idx = base + s
                    alphaAttr.array[idx] = 0
                    sizeAttr.array[idx] = 0
                }
                continue
            }

            const t = Math.max(0, Math.min(1, p.life[i] / p.maxLife[i]))
            const age = 1 - t
            const seed = p.seed ? p.seed[i] : (p.size[i] * 137.508) % 1

            const baseX = p.x[i]
            const baseY = p.y[i]

            const growth = age < 0.25 ? age / 0.25 : 1.0
            const strandHeight = p.size[i] * (3.2 + seed * 1.4) * growth

            for (let s = 0; s < SEGMENTS; s++) {
                const idx = base + s
                const frac = s / (SEGMENTS - 1)

                const wave1 = Math.sin(elapsed * 7.5 + seed * 30.0 + frac * 5.0)
                const wave2 = Math.sin(elapsed * 2.6 - seed * 18.0 - frac * 2.2)
                const sway = (wave1 * 0.65 + wave2 * 0.35) * frac * p.size[i] * 0.9

                const segX = baseX + sway
                const segY = baseY + frac * strandHeight

                posAttr.array[idx * 3] = segX
                posAttr.array[idx * 3 + 1] = segY
                posAttr.array[idx * 3 + 2] = 0.01

                const flicker = 0.82 + Math.sin(elapsed * 20.0 + seed * 50.0 + frac * 9.0) * 0.18

                // Slightly reduced particle size for less overall glow
                sizeAttr.array[idx] = p.size[i] * THREE.MathUtils.lerp(1.7, 0.12, frac) * flicker * (1.0 - age * 0.35) * 5
                alphaAttr.array[idx] = (1.0 - frac * 0.85) * Math.pow(t, 0.5) * flicker

                // Color ramp
                tmpColor.copy(hot)
                    .lerp(mid, THREE.MathUtils.smoothstep(frac, 0.1, 0.65))
                    .lerp(cool, THREE.MathUtils.smoothstep(frac, 0.65, 1.0))
                    .lerp(smoke, THREE.MathUtils.smoothstep(age, 0.6, 1.0) * 0.6)

                const cIdx = idx * 3
                colorAttr.array[cIdx] = tmpColor.r
                colorAttr.array[cIdx + 1] = tmpColor.g
                colorAttr.array[cIdx + 2] = tmpColor.b
            }
        }

        posAttr.needsUpdate = true
        sizeAttr.needsUpdate = true
        colorAttr.needsUpdate = true
        alphaAttr.needsUpdate = true
    })

    return (
        <points
            ref={pointsRef}
            geometry={geometry}
            material={material}
            frustumCulled={false}
        />
    )
}