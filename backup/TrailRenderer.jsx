// src/renderers/TrailRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { trailPuffs, updateTrailEmitter } from '../effects/gpu/TrailEmitter.js'

const MAX_TRAIL = 400

const matrix = new THREE.Matrix4()
const pos = new THREE.Vector3()
const scaleVec = new THREE.Vector3()
const scaleZero = new THREE.Vector3(0, 0, 0)
const quat = new THREE.Quaternion()
const euler = new THREE.Euler()

// -------------------------
// Soft, irregular smoke sprite baked once into a canvas texture.
// A single perfect radial gradient reads as a glowing orb; overlapping a
// few off-center soft blobs breaks up the silhouette so it reads as a puff
// of smoke instead of a sphere/disc.
// -------------------------
let _smokeTexture = null
function getSmokeTexture() {

    if (_smokeTexture) return _smokeTexture

    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    function blob(cx, cy, r, alpha) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
        g.addColorStop(0, `rgba(255,255,255,${alpha})`)
        g.addColorStop(0.55, `rgba(255,255,255,${alpha * 0.35})`)
        g.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, size, size)
    }

    ctx.globalCompositeOperation = 'lighter'
    blob(size * 0.50, size * 0.50, size * 0.48, 0.9)
    blob(size * 0.36, size * 0.42, size * 0.30, 0.5)
    blob(size * 0.63, size * 0.56, size * 0.28, 0.5)
    blob(size * 0.50, size * 0.66, size * 0.24, 0.4)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    _smokeTexture = texture
    return texture
}

export function TrailRenderer() {

    const meshRef = useRef()

    const geometry = useMemo(() => {

        const geo = new THREE.PlaneGeometry(1, 1)

        // custom per-instance attributes, driven manually through
        // onBeforeCompile below — the built-in mesh.instanceColor path
        // wasn't reliably reaching the shader, so color + alpha both
        // go through our own attributes instead.
        geo.setAttribute('puffColor', new THREE.InstancedBufferAttribute(new Float32Array(MAX_TRAIL * 3), 3))
        geo.setAttribute('puffAlpha', new THREE.InstancedBufferAttribute(new Float32Array(MAX_TRAIL), 1))

        return geo

    }, [])

    const material = useMemo(() => {

        const mat = new THREE.MeshBasicMaterial({
            map: getSmokeTexture(),
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending,   // real alpha blend reads as smoke; swap to AdditiveBlending for a glowier energy-trail look
        })

        mat.onBeforeCompile = (shader) => {

            shader.vertexShader = shader.vertexShader
                .replace(
                    '#include <common>',
                    `#include <common>
                    attribute vec3 puffColor;
                    attribute float puffAlpha;
                    varying vec3 vPuffColor;
                    varying float vPuffAlpha;`
                )
                .replace(
                    '#include <begin_vertex>',
                    `#include <begin_vertex>
                    vPuffColor = puffColor;
                    vPuffAlpha = puffAlpha;`
                )

            shader.fragmentShader = shader.fragmentShader
                .replace(
                    '#include <common>',
                    `#include <common>
                    varying vec3 vPuffColor;
                    varying float vPuffAlpha;`
                )
                .replace(
                    '#include <map_fragment>',
                    `#include <map_fragment>
                    diffuseColor.rgb *= vPuffColor;
                    diffuseColor.a *= vPuffAlpha;`
                )

        }

        return mat

    }, [])

    useFrame((_, dt) => {

        const mesh = meshRef.current
        if (!mesh) return

        updateTrailEmitter(dt)

        const colorAttr = mesh.geometry.attributes.puffColor
        const alphaAttr = mesh.geometry.attributes.puffAlpha

        for (let i = 0; i < MAX_TRAIL; i++) {

            const p = trailPuffs[i]

            if (!p.alive) {
                matrix.compose(pos.set(0, 0, 0), quat, scaleZero)
                mesh.setMatrixAt(i, matrix)
                alphaAttr.array[i] = 0
                continue
            }

            const t = Math.max(0, p.life / p.maxLife)   // 1 -> 0 across life
            const grow = 1.6 - t                        // swells as it dissipates, like real smoke

            const s = p.size * grow * 3.2

            euler.set(0, 0, p.spin)
            quat.setFromEuler(euler)

            pos.set(p.x, p.y, -0.01)
            scaleVec.set(s, s, s)
            matrix.compose(pos, quat, scaleVec)
            mesh.setMatrixAt(i, matrix)

            const cIdx = i * 3
            colorAttr.array[cIdx] = p.r
            colorAttr.array[cIdx + 1] = p.g
            colorAttr.array[cIdx + 2] = p.b

            // true alpha fade now (not a color-darkening hack), capped below 1
            // so overlapping puffs layer/blend instead of reading as flat discs
            alphaAttr.array[i] = t * 0.75

        }

        mesh.instanceMatrix.needsUpdate = true
        mesh.count = MAX_TRAIL
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