// src/renderers/DebrisRenderer.jsx

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { debrisPool, kind, updateDebrisEmitter } from "../fx/gpu/DebrisEmitter"

const MAX = debrisPool.capacity

const _matrix = new THREE.Matrix4()
const _pos = new THREE.Vector3()
const _scale = new THREE.Vector3()
const _rot = new THREE.Quaternion()
const _axis = new THREE.Vector3()

const vertexShader = /* glsl */ `
attribute float aAge;
attribute float aSeed;
attribute float aKind;

varying vec3 vNormal;
varying float vAge;
varying float vKind;

vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v){

    const vec2 C = vec2(1.0/6.0,1.0/3.0);
    const vec4 D = vec4(0.0,0.5,1.0,2.0);

    vec3 i = floor(v + dot(v,C.yyy));
    vec3 x0 = v - i + dot(i,C.xxx);

    vec3 g = step(x0.yzx,x0.xyz);
    vec3 l = 1.0 - g;

    vec3 i1 = min(g.xyz,l.zxy);
    vec3 i2 = max(g.xyz,l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);

    vec4 p = permute(
        permute(
        permute(
            i.z + vec4(0.0,i1.z,i2.z,1.0))
            + i.y + vec4(0.0,i1.y,i2.y,1.0))
            + i.x + vec4(0.0,i1.x,i2.x,1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy,y.xy);
    vec4 b1 = vec4(x.zw,y.zw);

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h,vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    vec4 norm = taylorInvSqrt(
        vec4(
            dot(p0,p0),
            dot(p1,p1),
            dot(p2,p2),
            dot(p3,p3)
        )
    );

    p0*=norm.x;
    p1*=norm.y;
    p2*=norm.z;
    p3*=norm.w;

    vec4 m = max(
        0.6 - vec4(
            dot(x0,x0),
            dot(x1,x1),
            dot(x2,x2),
            dot(x3,x3)
        ),
        0.0
    );

    m = m*m;

    return 42.0 * dot(
        m*m,
        vec4(
            dot(p0,x0),
            dot(p1,x1),
            dot(p2,x2),
            dot(p3,x3)
        )
    );
}

void main(){

    vAge = aAge;
    vKind = aKind;
    vNormal = normalize(normalMatrix * normal);

    float n = snoise(position * 2.0 + aSeed * 20.0);
    float bulge = n * 0.22 * (1.0 - aKind);

    vec3 displaced = position * (1.0 + bulge);

    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(displaced,1.0);

    gl_Position = projectionMatrix * mvPosition;

}
`

const fragmentShader = /* glsl */ `
varying vec3 vNormal;
varying float vAge;
varying float vKind;

void main(){

    vec3 rockColor = vec3(0.32,0.27,0.22);
    vec3 metalColor = vec3(0.50,0.53,0.58);

    vec3 base = mix(rockColor, metalColor, vKind);

    float lightWrap = clamp(
        dot(vNormal, normalize(vec3(0.4,0.6,0.7))),
        0.0,
        1.0
    );

    vec3 shaded = base * (0.35 + lightWrap * 0.85);

    float fresnel = pow(1.0 - abs(vNormal.z), 1.6);

    float emberBoost = smoothstep(0.35,0.0,vAge);

    shaded += vec3(1.0,0.45,0.12) * emberBoost * fresnel * 0.8;

    float alpha = smoothstep(1.0,0.82,vAge);

    gl_FragColor = vec4(shaded, alpha);

}
`

export function DebrisRenderer() {

    const ref = useRef()

    // Compact renderer-side buffers.
    // InstancedMesh instance N is NOT pool slot N.
    const ageBuffer = useMemo(() => new Float32Array(MAX), [])
    const seedBuffer = useMemo(() => new Float32Array(MAX), [])
    const kindBuffer = useMemo(() => new Float32Array(MAX), [])

    const geometry = useMemo(() => {

        const geo = new THREE.IcosahedronGeometry(1, 0)

        geo.setAttribute(
            "aAge",
            new THREE.InstancedBufferAttribute(ageBuffer, 1)
        )

        geo.setAttribute(
            "aSeed",
            new THREE.InstancedBufferAttribute(seedBuffer, 1)
        )

        geo.setAttribute(
            "aKind",
            new THREE.InstancedBufferAttribute(kindBuffer, 1)
        )

        return geo

    }, [])

    const material = useMemo(() => new THREE.ShaderMaterial({

        vertexShader,
        fragmentShader,

        transparent: true,
        depthWrite: true,

    }), [])

    useFrame((_, dt) => {

        updateDebrisEmitter(dt)

        const mesh = ref.current
        if (!mesh) return

        const p = debrisPool

        let count = 0

        for (let n = 0; n < p.activeCount; n++) {

            const i = p.activeIds[n]

            const pos = i * 3

            _pos.set(
                p.instancePosition[pos],
                p.instancePosition[pos + 1],
                p.instancePosition[pos + 2]
            )

            _scale.set(
                p.scale[pos],
                p.scale[pos + 1],
                p.scale[pos + 2]
            )

            _axis.set(
                p.axis[pos],
                p.axis[pos + 1],
                p.axis[pos + 2]
            )

            _rot.setFromAxisAngle(_axis, p.instanceRotation[i])

            _matrix.compose(_pos, _rot, _scale)

            mesh.setMatrixAt(count, _matrix)

            ageBuffer[count] = p.age[i]
            seedBuffer[count] = p.seed[i]
            kindBuffer[count] = kind[i]

            count++
        }

        mesh.count = count
        mesh.instanceMatrix.needsUpdate = true

        if (p.dirty) {

            geometry.attributes.aAge.needsUpdate = true
            geometry.attributes.aSeed.needsUpdate = true
            geometry.attributes.aKind.needsUpdate = true

            p.dirty = false
        }

    })

    return (
        <instancedMesh
            ref={ref}
            args={[geometry, material, MAX]}
            frustumCulled={false}
        />
    )

}