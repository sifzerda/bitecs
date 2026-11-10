// src/renderers/PoolParticles.jsx

import { useEffect, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

const ATTRIBUTE_LAYOUT = [
    ["aPosition", 3],
    ["aSize", 2],
    ["aRotation", 1],
    ["aColor", 3],
    ["aAlpha", 1],
]

const vertexShader = /* glsl */ `
attribute vec3 aPosition;
attribute vec2 aSize;
attribute float aRotation;
attribute vec3 aColor;
attribute float aAlpha;

varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;

void main() {
    vUv = uv;
    vColor = aColor;
    vAlpha = aAlpha;

    vec2 p = position.xy * aSize;

    float c = cos(aRotation);
    float s = sin(aRotation);

    p = vec2(
        p.x * c - p.y * s,
        p.x * s + p.y * c
    );

    gl_Position =
        projectionMatrix *
        modelViewMatrix *
        vec4(aPosition + vec3(p, 0.0), 1.0);
}
`

const fragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;

uniform float uKind;

void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float d = length(p);

    float alpha =
        (1.0 - smoothstep(0.0, 1.0, d)) *
        vAlpha;

    vec3 color = vColor;

    if (uKind < 0.5) {
        float taper =
            smoothstep(0.0, 0.15, vUv.x) *
            (1.0 - smoothstep(0.8, 1.0, vUv.x));

        float core = pow(
            1.0 - smoothstep(0.0, 0.6, abs(p.y)),
            2.0
        ) * taper;

        alpha =
            (
                core +
                0.3 * (1.0 - smoothstep(0.0, 1.0, d))
            ) * vAlpha;

        color = mix(
            vColor,
            vec3(1.0, 0.95, 0.8),
            core
        ) * 1.8;
    }

    if (alpha < 0.002) discard;

    gl_FragColor = vec4(color, alpha);
}
`

function createGeometry(capacity) {
    const base = new THREE.PlaneGeometry(1, 1)
    const geometry = new THREE.InstancedBufferGeometry()

    geometry.setIndex(base.index.clone())

    geometry.setAttribute(
        "position",
        base.getAttribute("position").clone()
    )

    geometry.setAttribute(
        "uv",
        base.getAttribute("uv").clone()
    )

    base.dispose()

    for (const [name, size] of ATTRIBUTE_LAYOUT) {
        const attribute = new THREE.InstancedBufferAttribute(
            new Float32Array(capacity * size),
            size
        )

        attribute.setUsage(THREE.DynamicDrawUsage)
        geometry.setAttribute(name, attribute)
    }

    geometry.instanceCount = 0

    return geometry
}

export function PoolParticles({
    pool,
    kind = 1,
    sample,
    additive = true,
}) {
    const geometry = useMemo(
        () => createGeometry(pool.capacity),
        [pool]
    )

    const material = useMemo(
        () => new THREE.ShaderMaterial({
            uniforms: {
                uKind: { value: kind },
            },
            vertexShader,
            fragmentShader,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            toneMapped: false,
            blending: additive
                ? THREE.AdditiveBlending
                : THREE.NormalBlending,
        }),
        [additive]
    )

    const attributes = useMemo(() => ({
        position: geometry.getAttribute("aPosition"),
        size: geometry.getAttribute("aSize"),
        rotation: geometry.getAttribute("aRotation"),
        color: geometry.getAttribute("aColor"),
        alpha: geometry.getAttribute("aAlpha"),
    }), [geometry])

    const scratch = useMemo(() => ({
        x: 0,
        y: 0,
        z: 0,
        width: 1,
        height: 1,
        rotation: 0,
        r: 1,
        g: 1,
        b: 1,
        alpha: 1,
    }), [])

    useEffect(() => {
        material.uniforms.uKind.value = kind
    }, [material, kind])

    useEffect(() => {
        return () => {
            geometry.dispose()
        }
    }, [geometry])

    useEffect(() => {
        return () => {
            material.dispose()
        }
    }, [material])

    useFrame(() => {
        const count = Math.min(
            pool.activeCount,
            pool.capacity
        )

        geometry.instanceCount = count

        if (count === 0) return

        const positions = attributes.position.array
        const sizes = attributes.size.array
        const rotations = attributes.rotation.array
        const colors = attributes.color.array
        const alphas = attributes.alpha.array

        for (let n = 0; n < count; n++) {
            const id = pool.activeIds[n]

            sample(pool, id, scratch)

            const p = n * 3
            const s = n * 2

            positions[p] = scratch.x
            positions[p + 1] = scratch.y
            positions[p + 2] = scratch.z

            sizes[s] = scratch.width
            sizes[s + 1] = scratch.height

            rotations[n] = scratch.rotation

            colors[p] = scratch.r
            colors[p + 1] = scratch.g
            colors[p + 2] = scratch.b

            alphas[n] = scratch.alpha
        }

        for (const [name, itemSize] of ATTRIBUTE_LAYOUT) {
            const attribute = geometry.getAttribute(name)

            attribute.clearUpdateRanges()
            attribute.addUpdateRange(
                0,
                count * itemSize
            )

            attribute.needsUpdate = true
        }
    })

    return (
        <mesh
            geometry={geometry}
            material={material}
            frustumCulled={false}
        />
    )
}
