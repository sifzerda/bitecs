// src/renderers/DebrisRenderer.jsx

import { useMemo, useRef, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { debrisPool, kind, updateDebrisEmitter } from "../fx/gpu/DebrisEmitter"

const MAX = debrisPool.capacity

const _matrix = new THREE.Matrix4()
const _pos = new THREE.Vector3()
const _scale = new THREE.Vector3()
const _rot = new THREE.Quaternion()
const _axis = new THREE.Vector3()

// -------------------------------------------------------------

const vertexShader = /* glsl */`

attribute float aAge;
attribute float aKind;

varying vec3 vNormal;
varying float vAge;
varying float vKind;

void main(){

    vAge = aAge;
    vKind = aKind;

    vNormal = normalize(normalMatrix * normal);

    gl_Position =
        projectionMatrix *
        modelViewMatrix *
        instanceMatrix *
        vec4(position,1.0);

}
`

// -------------------------------------------------------------

const fragmentShader = /* glsl */`

varying vec3 vNormal;
varying float vAge;
varying float vKind;

void main(){

    vec3 rockColor  = vec3(0.32,0.27,0.22);
    vec3 metalColor = vec3(0.50,0.53,0.58);

    vec3 base = mix(rockColor, metalColor, vKind);

    float lightWrap = clamp(
        dot(
            normalize(vNormal),
            normalize(vec3(0.4,0.6,0.7))
        ),
        0.0,
        1.0
    );

    vec3 shaded = base * (0.35 + lightWrap * 0.85);

    float fresnel = pow(
        1.0 - abs(vNormal.z),
        1.6
    );

    float heat = exp(-vAge * 6.0);

    shaded +=
        vec3(1.0,0.45,0.12)
        * heat
        * fresnel
        * 0.8;

    float alpha = smoothstep(
        1.0,
        0.82,
        vAge
    );

    gl_FragColor = vec4(shaded, alpha);

}
`

// -------------------------------------------------------------

export function DebrisRenderer() {

    const ref = useRef()

    const ageBuffer = useMemo(
        () => new Float32Array(MAX),
        []
    )

    const seedBuffer = useMemo(
        () => new Float32Array(MAX),
        []
    )

    const kindBuffer = useMemo(
        () => new Float32Array(MAX),
        []
    )

    // ---------------------------------------------------------

    const geometry = useMemo(() => {

        const geo = new THREE.IcosahedronGeometry(1, 0)

        //
        // Bake random chunk shape once.
        //

        const pos = geo.attributes.position

        for (let i = 0; i < pos.count; i++) {

            const x = pos.getX(i)
            const y = pos.getY(i)
            const z = pos.getZ(i)

            const scale =
                0.82 + Math.random() * 0.38

            pos.setXYZ(
                i,
                x * scale,
                y * scale,
                z * scale
            )

        }

        pos.needsUpdate = true
        geo.computeVertexNormals()

        //
        // Instance attributes
        //

        const ageAttr =
            new THREE.InstancedBufferAttribute(
                ageBuffer,
                1
            )

        const seedAttr =
            new THREE.InstancedBufferAttribute(
                seedBuffer,
                1
            )

        const kindAttr =
            new THREE.InstancedBufferAttribute(
                kindBuffer,
                1
            )

        ageAttr.setUsage(
            THREE.DynamicDrawUsage
        )

        seedAttr.setUsage(
            THREE.DynamicDrawUsage
        )

        kindAttr.setUsage(
            THREE.DynamicDrawUsage
        )

        geo.setAttribute(
            "aAge",
            ageAttr
        )

        geo.setAttribute(
            "aSeed",
            seedAttr
        )

        geo.setAttribute(
            "aKind",
            kindAttr
        )

        return geo

    }, [])

    // ---------------------------------------------------------

    const material = useMemo(() => {

        return new THREE.ShaderMaterial({

            vertexShader,
            fragmentShader,

            transparent: true,

            depthWrite: true,
            depthTest: true

        })

    }, [])

    // ---------------------------------------------------------

    useEffect(() => {

        if (!ref.current) return

        ref.current.instanceMatrix.setUsage(
            THREE.DynamicDrawUsage
        )

    }, [])

    // ---------------------------------------------------------

    const ageAttr = geometry.attributes.aAge
    const seedAttr = geometry.attributes.aSeed
    const kindAttr = geometry.attributes.aKind

    // ---------------------------------------------------------

    useFrame((_, dt) => {

        updateDebrisEmitter(dt)

        const mesh = ref.current
        if (!mesh) return

        const p = debrisPool

        let count = 0

        for (let n = 0; n < p.activeCount; n++) {

            const i = p.activeIds[n]
            const idx = i * 3

            _pos.x = p.instancePosition[idx]
            _pos.y = p.instancePosition[idx + 1]
            _pos.z = p.instancePosition[idx + 2]

            _scale.x = p.scale[idx]
            _scale.y = p.scale[idx + 1]
            _scale.z = p.scale[idx + 2]

            _axis.x = p.axis[idx]
            _axis.y = p.axis[idx + 1]
            _axis.z = p.axis[idx + 2]

            _rot.setFromAxisAngle(
                _axis,
                p.instanceRotation[i]
            )

            _matrix.compose(
                _pos,
                _rot,
                _scale
            )

            mesh.setMatrixAt(
                count,
                _matrix
            )

            ageBuffer[count] = p.age[i]
            seedBuffer[count] = p.seed[i]
            kindBuffer[count] = kind[i]

            count++

        }

        mesh.count = count

        if (count === 0)
            return

        mesh.instanceMatrix.needsUpdate = true

        if (p.dirty) {

            ageAttr.needsUpdate = true
            seedAttr.needsUpdate = true
            kindAttr.needsUpdate = true

            p.dirty = false

        }

    })

    // ---------------------------------------------------------

    return (

        <instancedMesh
            ref={ref}
            args={[geometry, material, MAX]}
            frustumCulled={false}
        />

    )

}