// src/renderers/SparkRenderer.jsx

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { sparkPool, updateSparkEmitter } from "../fx/gpu/SparkEmitter.js"

const MAX_SPARKS = sparkPool.capacity

// ------------------------------------------------------------
// Compact GPU buffers
// ------------------------------------------------------------

const gpuPosition = new Float32Array(MAX_SPARKS * 3)
const gpuScale = new Float32Array(MAX_SPARKS)
const gpuRotation = new Float32Array(MAX_SPARKS)
const gpuStretch = new Float32Array(MAX_SPARKS)
const gpuColor = new Float32Array(MAX_SPARKS * 3)
const gpuAlpha = new Float32Array(MAX_SPARKS)

export function SparkRenderer() {

    const meshRef = useRef()
    const geometry = useMemo(() => {
        const geo = new THREE.PlaneGeometry(1, 1)

        geo.setAttribute("instancePosition", new THREE.InstancedBufferAttribute(gpuPosition, 3))
        geo.setAttribute("instanceScale", new THREE.InstancedBufferAttribute(gpuScale, 1))
        geo.setAttribute("instanceRotation", new THREE.InstancedBufferAttribute(gpuRotation, 1))
        geo.setAttribute("instanceStretch", new THREE.InstancedBufferAttribute(gpuStretch, 1))
        geo.setAttribute("instanceColor", new THREE.InstancedBufferAttribute(gpuColor, 3))
        geo.setAttribute("instanceAlpha", new THREE.InstancedBufferAttribute(gpuAlpha, 1))

        return geo

    }, [])

    const material = useMemo(() => {

        return new THREE.ShaderMaterial({

            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,

            vertexShader: `

attribute vec3 instancePosition;
attribute float instanceScale;
attribute float instanceRotation;
attribute float instanceStretch;
attribute vec3 instanceColor;
attribute float instanceAlpha;

varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;

const float SIZE_BOOST = 1.8;

void main(){

    vec3 transformed = position;

    transformed.x *= instanceStretch * SIZE_BOOST;
    transformed.y *= instanceScale * SIZE_BOOST;

    float s = sin(instanceRotation);
    float c = cos(instanceRotation);

    transformed.xy = vec2(c * transformed.x - s * transformed.y, s * transformed.x + c * transformed.y);
    transformed += instancePosition;

    vUv = uv;
    vColor = instanceColor;
    vAlpha = instanceAlpha;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed,1.0);
}

`,

            fragmentShader: `

varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;

void main(){

    vec2 p = vUv - 0.5;

    float taper = smoothstep(0.0,0.1,vUv.x) * smoothstep(1.0,0.8,vUv.x);
    float distY = abs(p.y)*2.0;
    float core = pow(smoothstep(0.22,0.0,distY), 2.2) * taper;
    float innerGlow = pow(smoothstep(0.55,0.0,distY), 1.6) * taper;
    float haloDist = length(p * vec2(0.5,1.1));
    float halo = pow(smoothstep(1.0,0.0,haloDist), 1.4);

    vec3 hotCore = vec3(1.0,0.95,0.78);
    vec3 innerRed = vec3(1.0,0.10,0.02);
    vec3 neonRed = vec3(1.0,0.0,0.06);
    vec3 finalColor = hotCore * core * 2.6 + innerRed * innerGlow * 2.0 + neonRed * halo * 1.6;
    finalColor = mix(finalColor, finalColor * vColor * 1.3, 0.15);
    float alpha = clamp(core * 1.6 + innerGlow * 1.2 + halo * 0.9, 0.0, 1.0) * vAlpha;

    gl_FragColor = vec4(finalColor, alpha);
}

`
        })
    }, [])

    useFrame((_, dt) => {

        updateSparkEmitter(dt)

        const mesh = meshRef.current

        if (!mesh)
            return

        const p = sparkPool

        let count = 0

        // ----------------------------------------------------
        // Compact active particles
        // ----------------------------------------------------

        for (let n = 0; n < p.activeCount; n++) {

            const id = p.activeIds[n]
            const src = id * 3
            const dst = count * 3

            gpuPosition[dst] = p.instancePosition[src]
            gpuPosition[dst + 1] = p.instancePosition[src + 1]
            gpuPosition[dst + 2] = p.instancePosition[src + 2]

            gpuScale[count] = p.instanceScale[id]
            gpuRotation[count] = p.instanceRotation[id]
            gpuStretch[count] = p.instanceStretch[id]
            gpuAlpha[count] = p.instanceAlpha[id]

            gpuColor[dst] = p.instanceColor[src]
            gpuColor[dst + 1] = p.instanceColor[src + 1]
            gpuColor[dst + 2] = p.instanceColor[src + 2]

            count++
        }

        mesh.count = count

        if (count === 0)
            return

        if (!p.dirty)
            return

        const attrs = geometry.attributes

        attrs.instancePosition.needsUpdate = true
        attrs.instanceScale.needsUpdate = true
        attrs.instanceRotation.needsUpdate = true
        attrs.instanceStretch.needsUpdate = true
        attrs.instanceColor.needsUpdate = true
        attrs.instanceAlpha.needsUpdate = true

        p.dirty = false

    })

    return (
        <instancedMesh ref={meshRef} args={[geometry, material, MAX_SPARKS]} frustumCulled={false} />
    )

}