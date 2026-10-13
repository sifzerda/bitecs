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
//
// What changed vs. the old renderer
//
//  - Shape variety: each piece now gets its own lumpy shape from aSeed in the
//    vertex shader. The old per-vertex Math.random() bake moved the three corners
//    of every shared vertex independently, which tears the faces apart, and it
//    gave every instance the same silhouette anyway.
//  - Lighting follows the tumble: normals now come from screen-space derivatives
//    of the final shape, so facets light and darken as pieces rotate. The old
//    vNormal ignored the instance matrix, so shading never changed while spinning.
//  - aHeat: rim glow up to 1, whole-piece glow above 1 (the emitter cools it).
//  - aGlint: specular / birth / flicker flashes from the emitter styles.
//  - Metal gets a real highlight and a cheap sky-versus-ground reflection.
//
// -------------------------------------------------------------

const vertexShader = /* glsl */`

attribute float aAge;
attribute float aKind;
attribute float aSeed;
attribute float aHeat;
attribute float aGlint;

varying vec3 vViewPos;
varying float vAge;
varying float vKind;
varying float vSeed;
varying float vHeat;
varying float vGlint;

float hash13(vec3 p){
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main(){

    vAge = aAge;
    vKind = aKind;
    vSeed = aSeed;
    vHeat = aHeat;
    vGlint = aGlint;

    // Same corner => same hash, so the faces stay joined. aSeed makes each piece differ.
    vec3 corner = floor(position * 64.0 + 0.5);
    float lump = 0.82 + 0.38 * hash13(corner + aSeed * 37.0);

    vec4 viewPos = modelViewMatrix * instanceMatrix * vec4(position * lump, 1.0);

    vViewPos = viewPos.xyz;

    gl_Position = projectionMatrix * viewPos;

}
`

// -------------------------------------------------------------

const fragmentShader = /* glsl */`

varying vec3 vViewPos;
varying float vAge;
varying float vKind;
varying float vSeed;
varying float vHeat;
varying float vGlint;

float hash11(float n){
    return fract(sin(n * 127.1) * 43758.5453);
}

float hash13(vec3 p){
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main(){

    // Flat facet normal of the displaced, rotated shape
    vec3 n = normalize(cross(dFdx(vViewPos), dFdy(vViewPos)));

    vec3 L = normalize(vec3(0.4,0.6,0.7));
    vec3 V = vec3(0.0,0.0,1.0);

    // Per-piece and per-facet variation so no two chunks look alike
    float pieceTint = 0.8 + 0.4 * hash11(vSeed * 3.7);
    float facet = hash13(floor(n * 6.0 + 6.0) + vSeed * 7.0);

    vec3 rockColor  = vec3(0.32,0.27,0.22) * pieceTint * (0.85 + 0.3 * facet);
    vec3 metalColor = vec3(0.50,0.53,0.58) * (0.9 + 0.2 * facet);

    vec3 base = mix(rockColor, metalColor, vKind);

    float lightWrap = clamp(dot(n, L), 0.0, 1.0);

    vec3 hemi = mix(vec3(0.07,0.06,0.06), vec3(0.16,0.17,0.20), n.y * 0.5 + 0.5);

    vec3 shaded = base * (0.35 + lightWrap * 0.85) + base * hemi * 0.6;

    // Metal: tight highlight plus a sky-versus-ground reflection
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(n, H), 0.0), 26.0);
    vec3 R = reflect(-V, n);

    shaded = mix(shaded, shaded * (0.55 + 0.9 * (R.y * 0.5 + 0.5)), vKind * 0.6);
    shaded += vec3(0.9,0.95,1.0) * spec * vKind * 0.9;

    // Heat: up to 1 is a rim glow (same look as before), above 1 the piece glows through
    float fresnel = pow(1.0 - abs(n.z), 1.6);

    float rimHeat = clamp(vHeat, 0.0, 1.0);
    float bodyHeat = clamp(vHeat - 1.0, 0.0, 1.0);

    vec3 hot = vec3(1.0,0.45,0.12);

    shaded += hot * rimHeat * fresnel * 0.8;

    vec3 glow = mix(vec3(1.0,0.38,0.08), vec3(1.0,0.82,0.45), bodyHeat);

    shaded = mix(shaded, glow, bodyHeat * (0.5 + 0.5 * facet) * 0.85);
    shaded += hot * bodyHeat * 0.35;

    // Flash: specular glint, birth flash or ember flicker
    shaded = mix(shaded, vec3(1.0,0.93,0.8), vGlint * 0.45 * (0.4 + 0.6 * lightWrap));

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

    const ageBuffer = useMemo(() => new Float32Array(MAX), [])
    const seedBuffer = useMemo(() => new Float32Array(MAX), [])
    const kindBuffer = useMemo(() => new Float32Array(MAX), [])
    const heatBuffer = useMemo(() => new Float32Array(MAX), [])
    const glintBuffer = useMemo(() => new Float32Array(MAX), [])

    // ---------------------------------------------------------

    const geometry = useMemo(() => {

        // Shape variation now happens per instance in the vertex shader.
        const geo = new THREE.IcosahedronGeometry(1, 0)

        const attrs = {
            aAge: ageBuffer,
            aSeed: seedBuffer,
            aKind: kindBuffer,
            aHeat: heatBuffer,
            aGlint: glintBuffer,
        }

        for (const name in attrs) {

            const attr = new THREE.InstancedBufferAttribute(attrs[name], 1)

            attr.setUsage(THREE.DynamicDrawUsage)

            geo.setAttribute(name, attr)

        }

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

    const attrs = geometry.attributes

    // ---------------------------------------------------------

    useFrame((_, dt) => {

        // A tab switch can hand us a huge dt; don't let it explode the sim
        updateDebrisEmitter(Math.min(dt, 1 / 20))

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
            heatBuffer[count] = p.heat[i]
            glintBuffer[count] = p.glint[i]

            count++

        }

        mesh.count = count

        if (count === 0)
            return

        mesh.instanceMatrix.needsUpdate = true

        if (p.dirty) {

            attrs.aAge.needsUpdate = true
            attrs.aSeed.needsUpdate = true
            attrs.aKind.needsUpdate = true
            attrs.aHeat.needsUpdate = true
            attrs.aGlint.needsUpdate = true

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