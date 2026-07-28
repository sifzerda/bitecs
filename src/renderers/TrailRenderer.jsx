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
// -------------------------

function getSmokeTexture() {

    if (smokeTexture) return smokeTexture

    const size = 128
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")

    function blob(x, y, radius, alpha) {

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)

        gradient.addColorStop(0, `rgba(255,255,255,${alpha})`)
        gradient.addColorStop(0.5, `rgba(255,255,255,${alpha * 0.35})`)
        gradient.addColorStop(1, "rgba(255,255,255,0)")

        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, size, size)
    }

    ctx.globalCompositeOperation = "lighter"

    blob(size * .5, size * .5, size * .48, .9)
    blob(size * .36, size * .42, size * .3, .5)
    blob(size * .63, size * .56, size * .28, .5)
    blob(size * .5, size * .66, size * .24, .4)

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

        geo.setAttribute("puffColor", new THREE.InstancedBufferAttribute(trailPool.color, 3))
        geo.setAttribute("puffAlpha", new THREE.InstancedBufferAttribute(trailPool.alpha, 1))

        return geo

    }, [])

    const material = useMemo(() => {

        const mat = new THREE.MeshBasicMaterial({
            map: getSmokeTexture(),
            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,   // real alpha blend reads as smoke; swap to AdditiveBlending for a glowier energy-trail look
            toneMapped: false,
        })

        mat.onBeforeCompile = shader => {

            shader.vertexShader = shader.vertexShader.replace("#include <common>",
                `
#include <common>

attribute vec3 puffColor;
attribute float puffAlpha;

varying vec3 vPuffColor;
varying float vPuffAlpha;
`
            )

            shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>",
                `
#include <begin_vertex>

vPuffColor = puffColor;
vPuffAlpha = puffAlpha;
`
            )

            shader.fragmentShader = shader.fragmentShader.replace("#include <common>",
                `
#include <common>

varying vec3 vPuffColor;
varying float vPuffAlpha;
`
            )
            shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>",
                `
#include <map_fragment>

diffuseColor.rgb *= vPuffColor;
diffuseColor.a *= vPuffAlpha;
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
        const color = mesh.geometry.attributes.puffColor
        const alpha = mesh.geometry.attributes.puffAlpha

        let visible = 0

        for (let n = 0; n < p.activeCount; n++) {

            const i = p.activeIds[n]
            const life = p.life[i] / p.maxLife[i]
            const grow = 1.6 - life
            const size = p.size[i] * grow * 3.2

            position.set(p.x[i], p.y[i], -0.01)
            quaternion.setFromAxisAngle(axis, p.spin[i])

            scale.set(size, size, size)
            matrix.compose(position, quaternion, scale)
            mesh.setMatrixAt(visible, matrix)
            // pack attributes

            const src = i * 3
            const dst = visible * 3

            color.array[dst] = p.color[src]
            color.array[dst + 1] = p.color[src + 1]
            color.array[dst + 2] = p.color[src + 2]

            alpha.array[visible] = p.alpha[i]

            visible++
        }

        mesh.count = visible
        mesh.instanceMatrix.needsUpdate = true
        color.needsUpdate = true
        alpha.needsUpdate = true
    })

    return (
        <instancedMesh ref={meshRef} args={[geometry, material, MAX_TRAIL]} frustumCulled={false} />
    )

}