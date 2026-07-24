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

void main(){

    vec3 transformed = position;

    transformed.x *= instanceStretch;
    transformed.y *= instanceScale;

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

    // center the uv, y is the thin axis (ember body), x is the stretch/tail axis
    vec2 p = vUv - 0.5;

    // round off the body across the thin axis, elongated along the tail axis
    float body = length(p * vec2(0.65, 1.6));
    float core = smoothstep(0.5, 0.0, body);
    core = pow(core, 1.8);

    // tail fade: hot bright head at x=1 (leading edge), cooling / thinning toward x=0 (trailing)
    float tail = smoothstep(0.0, 1.0, vUv.x);
    float heat = core * mix(0.35, 1.0, tail);

    // molten ember color ramp: deep red edge -> orange -> white-hot core
    vec3 edgeColor = vec3(0.55, 0.05, 0.01);
    vec3 midColor  = vec3(1.0, 0.38, 0.04);
    vec3 hotCore   = vec3(1.0, 0.92, 0.65);

    vec3 emberColor = mix(edgeColor, midColor, smoothstep(0.0, 0.55, heat));
    emberColor = mix(emberColor, hotCore, smoothstep(0.55, 1.0, heat));

    // subtle per-instance tint for variation, kept mild so it stays "hot metal" not rainbow
    emberColor = mix(emberColor, emberColor * vColor * 1.4, 0.25);

    float alpha = core * vAlpha;

    gl_FragColor = vec4(emberColor, alpha);
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