// src/renderers/SparkRenderer.jsx

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { sparkPool, updateSparkEmitter } from "../fx/gpu/SparkEmitter.js"

const MAX_SPARKS = 4096


export function SparkRenderer() {

    const meshRef = useRef()
    const geometry = useMemo(() => {
        const geo = new THREE.PlaneGeometry(1, 1)

        geo.setAttribute("instancePosition", new THREE.InstancedBufferAttribute(sparkPool.instancePosition, 3))
        geo.setAttribute("instanceScale", new THREE.InstancedBufferAttribute(sparkPool.instanceScale, 1))
        geo.setAttribute("instanceRotation", new THREE.InstancedBufferAttribute(sparkPool.instanceRotation, 1))
        geo.setAttribute("instanceStretch", new THREE.InstancedBufferAttribute(sparkPool.instanceStretch, 1))
        geo.setAttribute("instanceColor", new THREE.InstancedBufferAttribute(sparkPool.instanceColor, 3))
        geo.setAttribute("instanceAlpha", new THREE.InstancedBufferAttribute(sparkPool.instanceAlpha, 1))

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

    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);

}
`,

            fragmentShader: `

varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;

void main() {

    vec2 p = vUv - 0.5;

    // taper the streak to a point at both ends, like a real spark trail
    float taper = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.8, vUv.x);

    // thin bright core line running along the streak
    float distY = abs(p.y) * 2.0;
    float core = pow(smoothstep(0.22, 0.0, distY), 2.2) * taper;

    // tighter red glow hugging the core
    float innerGlow = pow(smoothstep(0.55, 0.0, distY), 1.6) * taper;

    // wide soft radial halo for neon bleed, blooms past the tapered tips
    float haloDist = length(p * vec2(0.5, 1.1));
    float halo = pow(smoothstep(1.0, 0.0, haloDist), 1.4);

    vec3 hotCore  = vec3(1.0, 0.95, 0.78);
    vec3 innerRed = vec3(1.0, 0.10, 0.02);
    vec3 neonRed  = vec3(1.0, 0.0, 0.06);

    vec3 finalColor = hotCore * core * 2.6 + innerRed * innerGlow * 2.0 + neonRed * halo * 1.6;

    // subtle per-instance tint, kept mild so the neon red reads clean
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

        if (!mesh) return
        if (!sparkPool.dirty) return

        const attributes = mesh.geometry.attributes

        attributes.instancePosition.needsUpdate = true
        attributes.instanceScale.needsUpdate = true
        attributes.instanceColor.needsUpdate = true
        attributes.instanceAlpha.needsUpdate = true
        attributes.instanceRotation.needsUpdate = true
        attributes.instanceStretch.needsUpdate = true

        sparkPool.dirty = false

    })

    return (

        <instancedMesh
            ref={meshRef}
            args={[geometry, material, MAX_SPARKS]}
            frustumCulled={false}
        />

    )

}