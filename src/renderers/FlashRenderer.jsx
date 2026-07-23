// src/renderers/FlashRenderer.jsx

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { flashPool, updateFlashEmitter } from "../effects/gpu/FlashEmitter.js"

const MAX = 64

const matrix = new THREE.Matrix4()
const pos = new THREE.Vector3()
const scaleVec = new THREE.Vector3()
const rot = new THREE.Quaternion()
const zAxis = new THREE.Vector3(0, 0, 1)

const vertexShader = /* glsl */ `
attribute float aAge;
attribute float aSeed;
attribute vec3 aTint;

varying vec2 vUv;
varying float vAge;
varying vec3 vTint;

void main() {
    vUv = uv;
    vAge = aAge;
    vTint = aTint;

    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
}
`

const fragmentShader = /* glsl */ `
varying vec2 vUv;
varying float vAge;
varying vec3 vTint;

void main() {
    // stretch the falloff so it reads as a directional muzzle bloom, not a circle
    vec2 p = (vUv - 0.5) * vec2(1.0, 1.65);
    float d = length(p);

    float core = smoothstep(0.32, 0.0, d);
    float glow = smoothstep(0.65, 0.05, d);

    vec3 white  = vec3(1.0, 0.98, 0.92);
    vec3 color  = mix(vTint, white, core);

    float alpha = glow * (1.0 - vAge);
    alpha *= alpha; // sharper cutoff so it doesn't linger visually

    gl_FragColor = vec4(color, alpha);
}
`

export function FlashRenderer() {

    const ref = useRef()

    const geo = useMemo(() => {

        const g = new THREE.PlaneGeometry(1, 1)
        const ages = new Float32Array(MAX)
        const seeds = new Float32Array(MAX)
        const tints = new Float32Array(MAX * 3)

        g.setAttribute("aAge", new THREE.InstancedBufferAttribute(ages, 1))
        g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1))
        g.setAttribute("aTint", new THREE.InstancedBufferAttribute(tints, 3))

        return g

    }, [])

    const material = useMemo(() => new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    }), [])

    useFrame((_, dt) => {

        updateFlashEmitter(dt)

        const ageAttr = geo.attributes.aAge
        const tintAttr = geo.attributes.aTint

        const p = flashPool

        let count = 0


        for (let i = 0; i < p.capacity; i++) {


            if (!p.alive[i])
                continue



            const t =
                1 -
                p.life[i] / p.maxLife[i]



            pos.set(
                p.x[i],
                p.y[i],
                0.3
            )



            const pop =
                1 -
                t * 0.5



            scaleVec.set(
                p.size[i] * 1.6 * pop,
                p.size[i] * 0.9 * pop,
                1
            )



            rot.setFromAxisAngle(
                zAxis,
                p.angle[i]
            )



            matrix.compose(
                pos,
                rot,
                scaleVec
            )



            ref.current.setMatrixAt(
                count,
                matrix
            )



            ageAttr.array[count] =
                t



            tintAttr.array[count * 3 + 0] =
                p.r[i]


            tintAttr.array[count * 3 + 1] =
                p.g[i]


            tintAttr.array[count * 3 + 2] =
                p.b[i]



            count++

        }



        ref.current.count =
            count



        ref.current.instanceMatrix.needsUpdate = true

        ageAttr.needsUpdate = true

        tintAttr.needsUpdate = true

    })

    return (
        <instancedMesh
            ref={ref}
            args={[geo, material, MAX]}
            frustumCulled={false}
        />
    )

}