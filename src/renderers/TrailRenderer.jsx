// src/renderers/TrailRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { trailPool, updateTrailEmitter } from "../fx/gpu/TrailEmitter.js"

const MAX_TRAIL = 400

// Reusable objects (no allocations per frame)
const matrix = new THREE.Matrix4()
const position = new THREE.Vector3()
const scale = new THREE.Vector3()
const quaternion = new THREE.Quaternion()
const axis = new THREE.Vector3(0, 0, 1)

let smokeTexture = null

// -------------------------------------------------------------
// Better fire / smoke texture (multi-scale irregular blobs)
// -------------------------------------------------------------
function getSmokeTexture() {
    if (smokeTexture) return smokeTexture

    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    // clear
    ctx.clearRect(0, 0, size, size)

    function blob(x, y, radius, alpha) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, radius)
        g.addColorStop(0, `rgba(255,255,255,${alpha})`)
        g.addColorStop(0.35, `rgba(255,255,255,${alpha * 0.55})`)
        g.addColorStop(0.7, `rgba(255,255,255,${alpha * 0.18})`)
        g.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
    }

    // Additive layering creates the soft but irregular fire-cloud look
    ctx.globalCompositeOperation = 'lighter'

    // Large main body
    blob(size * 0.50, size * 0.50, size * 0.46, 0.95)

    // Mid-scale irregular puffs
    blob(size * 0.38, size * 0.42, size * 0.32, 0.65)
    blob(size * 0.62, size * 0.55, size * 0.30, 0.60)
    blob(size * 0.48, size * 0.68, size * 0.28, 0.55)
    blob(size * 0.55, size * 0.35, size * 0.26, 0.50)

    // Smaller hot spots / detail
    blob(size * 0.42, size * 0.52, size * 0.18, 0.70)
    blob(size * 0.58, size * 0.45, size * 0.16, 0.65)
    blob(size * 0.50, size * 0.58, size * 0.14, 0.60)

    // Tiny bright cores
    blob(size * 0.47, size * 0.48, size * 0.08, 0.90)
    blob(size * 0.53, size * 0.52, size * 0.07, 0.85)

    smokeTexture = new THREE.CanvasTexture(canvas)
    smokeTexture.minFilter = THREE.LinearFilter
    smokeTexture.magFilter = THREE.LinearFilter
    smokeTexture.needsUpdate = true
    return smokeTexture
}

// ============================================================
// Renderer
// ============================================================

export function TrailRenderer() {
    const meshRef = useRef()

    const geometry = useMemo(() => {
        const geo = new THREE.PlaneGeometry(1, 1)
        geo.setAttribute('puffColor', new THREE.InstancedBufferAttribute(trailPool.color, 3))
        geo.setAttribute('puffAlpha', new THREE.InstancedBufferAttribute(trailPool.alpha, 1))
        return geo
    }, [])

    const material = useMemo(() => {
        const mat = new THREE.MeshBasicMaterial({
            map: getSmokeTexture(),
            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
        })

        mat.onBeforeCompile = (shader) => {
            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `
#include <common>
attribute vec3 puffColor;
attribute float puffAlpha;
varying vec3 vPuffColor;
varying float vPuffAlpha;
`
            )

            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `
#include <begin_vertex>
vPuffColor = puffColor;
vPuffAlpha = puffAlpha;
`
            )

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                `
#include <common>
varying vec3 vPuffColor;
varying float vPuffAlpha;
`
            )

            // Stronger, hotter look that matches the rocket plume
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <map_fragment>',
                `
#include <map_fragment>

// Boost the texture so the core stays bright white/yellow
float lum = dot(texture2D(map, vMapUv).rgb, vec3(0.299, 0.587, 0.114));
vec3 boosted = diffuseColor.rgb * (0.75 + lum * 0.9);

diffuseColor.rgb = boosted * vPuffColor;
diffuseColor.a *= vPuffAlpha * (0.35 + lum * 0.4);
`
            )
        }

        return mat
    }, [])

    useFrame((_, dt) => {
        const mesh = meshRef.current
        if (!mesh) return

        updateTrailEmitter(dt)

        const p = trailPool
        const colorAttr = mesh.geometry.attributes.puffColor
        const alphaAttr = mesh.geometry.attributes.puffAlpha

        let visible = 0

        for (let n = 0; n < p.activeCount; n++) {
            const i = p.activeIds[n]

            const life = p.life[i] / p.maxLife[i]          // 1 → 0
            const age = 1.0 - life                        // 0 → 1

            // Grow faster at first, then keep expanding (matches the big billowy cloud)
            const grow = 1.0 + age * 1.4
            const size = p.size[i] * grow * 1.6

            position.set(p.x[i], p.y[i], -0.01)
            quaternion.setFromAxisAngle(axis, p.spin[i])
            scale.set(size, size, size)
            matrix.compose(position, quaternion, scale)
            mesh.setMatrixAt(visible, matrix)

            // Color: keep the original pool color but we already boost it in the shader.
            // If you want a forced hot→cool progression you can override here.
            const src = i * 3
            const dst = visible * 3
            colorAttr.array[dst] = p.color[src]
            colorAttr.array[dst + 1] = p.color[src + 1]
            colorAttr.array[dst + 2] = p.color[src + 2]

            // Slightly higher alpha early, softer later
            alphaAttr.array[visible] = p.alpha[i] * (0.85 + life * 0.4)

            visible++
        }

        mesh.count = visible
        mesh.instanceMatrix.needsUpdate = true
        colorAttr.needsUpdate = true
        alphaAttr.needsUpdate = true
    })

    return (
        <instancedMesh
            ref={meshRef}
            args={[geometry, material, MAX_TRAIL]}
            frustumCulled={false}
        />
    )
}