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

const vertexShader = /* glsl */ `
attribute float aAlpha;
attribute vec3 aTint;

varying float vAlpha;
varying vec3 vTint;
varying vec2 vUv;

void main() {

    vAlpha = aAlpha;
    vTint = aTint;
    vUv = uv;

    gl_Position = projectionMatrix *
                  modelViewMatrix *
                  instanceMatrix *
                  vec4(position,1.0);

}
`

const fragmentShader = /* glsl */ `
varying float vAlpha;
varying vec3 vTint;
varying vec2 vUv;

void main(){

    vec2 p = (vUv - 0.5) * vec2(1.0,1.65);

    float d = length(p);

    float core = smoothstep(0.32,0.0,d);
    float glow = smoothstep(0.65,0.05,d);

    vec3 white = vec3(1.0,0.98,0.92);
    vec3 color = mix(vTint, white, core);

    float alpha = glow * vAlpha;
    alpha *= alpha;

    if(alpha < 0.001) discard;

    gl_FragColor = vec4(color, alpha);

}
`

export function FlashRenderer() {

    const meshRef = useRef()

    const tintBuffer = useMemo(() => new Float32Array(MAX * 3), [])
    const alphaBuffer = useMemo(() => new Float32Array(MAX), [])

    const geometry = useMemo(() => {

        const geo = new THREE.PlaneGeometry(1.6, 0.9)

        const tint = new THREE.InstancedBufferAttribute(tintBuffer, 3)
        const alpha = new THREE.InstancedBufferAttribute(alphaBuffer, 1)

        tint.setUsage(THREE.DynamicDrawUsage)
        alpha.setUsage(THREE.DynamicDrawUsage)

        geo.setAttribute("aTint", tint)
        geo.setAttribute("aAlpha", alpha)

        return geo

    }, [tintBuffer, alphaBuffer])

    const material = useMemo(() => new THREE.ShaderMaterial({

        vertexShader,
        fragmentShader,

        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,

    }), [])

    useFrame((_, dt) => {

        updateFlashEmitter(dt)

        const mesh = meshRef.current
        if (!mesh) return

        const p = flashPool

        const activeCount = p.activeCount
        const activeIds = p.activeIds

        const countChanged = mesh.count !== activeCount

        if (!p.dirty && !countChanged)
            return

        for (let n = 0; n < activeCount; n++) {

            const id = activeIds[n]

            const src3 = id * 3
            const dst3 = n * 3

            _pos.set(
                p.instancePosition[src3],
                p.instancePosition[src3 + 1],
                p.instancePosition[src3 + 2]
            )

            const s = p.instanceScale[id]
            _scale.set(s, s, 1)

            _rot.setFromAxisAngle(_zAxis, p.instanceRotation[id])

            _matrix.compose(_pos, _rot, _scale)
            mesh.setMatrixAt(n, _matrix)

            tintBuffer[dst3]     = p.instanceColor[src3]
            tintBuffer[dst3 + 1] = p.instanceColor[src3 + 1]
            tintBuffer[dst3 + 2] = p.instanceColor[src3 + 2]

            alphaBuffer[n] = p.instanceAlpha[id]

        }

        mesh.count = activeCount
        mesh.instanceMatrix.needsUpdate = true

        const tintAttr = geometry.attributes.aTint
        const alphaAttr = geometry.attributes.aAlpha

        if (tintAttr.clearUpdateRanges) {
            tintAttr.clearUpdateRanges()
            tintAttr.addUpdateRange(0, activeCount * 3)
        }

        if (alphaAttr.clearUpdateRanges) {
            alphaAttr.clearUpdateRanges()
            alphaAttr.addUpdateRange(0, activeCount)
        }

        tintAttr.needsUpdate = true
        alphaAttr.needsUpdate = true

        p.dirty = false

    })

    return (
        <instancedMesh
            ref={meshRef}
            args={[geometry, material, MAX]}
            frustumCulled={false}
        />
    )

}