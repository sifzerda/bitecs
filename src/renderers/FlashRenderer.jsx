// src/renderers/FlashRenderer.jsx

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { flashPool, updateFlashEmitter } from "../fx/gpu/FlashEmitter.js"

const MAX = flashPool.capacity

const _matrix = new THREE.Matrix4()
const _pos = new THREE.Vector3()
const _scale = new THREE.Vector3()
const _rot = new THREE.Quaternion()
const _zAxis = new THREE.Vector3(0, 0, 1)

const vertexShader = /* glsl */ 
`
attribute float aAlpha;
attribute vec3 aTint;

varying float vAlpha;
varying vec3 vTint;

void main() {
    vAlpha = aAlpha;
    vTint = aTint;

    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
}
`

const fragmentShader = /* glsl */ 
`
varying float vAlpha;
varying vec3 vTint;

void main() {
    // gl_PointCoord isn't available for instanced planes — use a manual UV-style coord
    vec2 p = (gl_FragCoord.xy - gl_FragCoord.xy); // placeholder, replaced below
}
`

export function FlashRenderer() {

    const ref = useRef()

    // width/height ratio baked into the base geometry (was anisotropic
    // per-instance scale before — instanceScale is a plain scalar in the
    // pool, so the 1.6 / 0.9 aspect now lives here instead)
    const geo = useMemo(() => new THREE.PlaneGeometry(1.6, 0.9), [])

    // local compacted-index buffers — matrices are compacted (dead slots
    // skipped) so per-instance attributes must be written at the same
    // compacted index, not the raw pool slot id
    const tintBuffer = useMemo(() => new Float32Array(MAX * 3), [])
    const alphaBuffer = useMemo(() => new Float32Array(MAX), [])

    const attrGeo = useMemo(() => {
        geo.setAttribute("aTint", new THREE.InstancedBufferAttribute(tintBuffer, 3))
        geo.setAttribute("aAlpha", new THREE.InstancedBufferAttribute(alphaBuffer, 1))
        return geo
    }, [geo, tintBuffer, alphaBuffer])

    const material = useMemo(() => new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader: /* glsl */ `
varying float vAlpha;
varying vec3 vTint;

void main() {
    vec2 p = (vUv - 0.5) * vec2(1.0, 1.65);
    float d = length(p);

    float core = smoothstep(0.32, 0.0, d);
    float glow = smoothstep(0.65, 0.05, d);

    vec3 white = vec3(1.0, 0.98, 0.92);
    vec3 color = mix(vTint, white, core);

    float alpha = glow * vAlpha;
    alpha *= alpha;

    gl_FragColor = vec4(color, alpha);
}
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    }), [])

    useFrame((_, dt) => {

        updateFlashEmitter(dt)

        const p = flashPool
        const mesh = ref.current
        if (!mesh) return

        let count = 0

        for (let i = 0; i < p.capacity; i++) {

            if (!p.alive[i])
                continue

            const pos = i * 3

            _pos.set(p.instancePosition[pos], p.instancePosition[pos + 1], p.instancePosition[pos + 2])
            _scale.set(p.instanceScale[i], p.instanceScale[i], 1)
            _rot.setFromAxisAngle(_zAxis, p.instanceRotation[i])
            _matrix.compose(_pos, _rot, _scale)
            mesh.setMatrixAt(count, _matrix)

            tintBuffer[count * 3] = p.instanceColor[pos]
            tintBuffer[count * 3 + 1] = p.instanceColor[pos + 1]
            tintBuffer[count * 3 + 2] = p.instanceColor[pos + 2]
            alphaBuffer[count] = p.instanceAlpha[i]

            count++

        }

        mesh.count = count
        mesh.instanceMatrix.needsUpdate = true
        mesh.geometry.attributes.aTint.needsUpdate = true
        mesh.geometry.attributes.aAlpha.needsUpdate = true

    })

    return (
        <instancedMesh ref={ref} args={[attrGeo, material, MAX]} frustumCulled={false} />
    )

}