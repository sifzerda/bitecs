//src/renderers/ExplosionRenderer.jsx

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { explosions, updateExplosionEmitter } from "../effects/gpu/ExplosionEmitter"

const MAX = 512

const matrix = new THREE.Matrix4()
const pos = new THREE.Vector3()
const scaleVec = new THREE.Vector3()
const rot = new THREE.Quaternion()
const axis = new THREE.Vector3()

const VERTEX_SHADER = /* glsl */ `
attribute float aAge;
attribute float aSeed;

varying vec3 vNormal;
varying float vAge;
varying float vSeed;

// classic 3D simplex-ish noise (cheap, good enough for silhouette breakup)
vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

float fbm(vec3 p){
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 3; i++) {
        sum += snoise(p) * amp;
        p *= 2.0;
        amp *= 0.5;
    }
    return sum;
}

void main() {
    vAge = aAge;
    vSeed = aSeed;
    vNormal = normalize(normalMatrix * normal);

    // lumpy, licking-flame silhouette that settles as the fireball ages
    float n = fbm(normal * 2.5 + aSeed * 12.0);
    float bulge = n * 0.4 * (1.0 - aAge * 0.6);
    vec3 displaced = position * (1.0 + bulge);

    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(displaced, 1.0);
    gl_Position = projectionMatrix * mvPosition;
}
`

const FRAGMENT_SHADER = /* glsl */ `
varying vec3 vNormal;
varying float vAge;
varying float vSeed;

vec3 fireRamp(float t) {
    vec3 white  = vec3(1.0, 0.97, 0.85);
    vec3 yellow = vec3(1.0, 0.82, 0.25);
    vec3 orange = vec3(1.0, 0.42, 0.05);
    vec3 red    = vec3(0.55, 0.08, 0.02);
    vec3 smoke  = vec3(0.12, 0.11, 0.11);

    if (t < 0.12) return mix(white, yellow, t / 0.12);
    if (t < 0.35) return mix(yellow, orange, (t - 0.12) / 0.23);
    if (t < 0.65) return mix(orange, red, (t - 0.35) / 0.30);
    return mix(red, smoke, (t - 0.65) / 0.35);
}

void main() {
    float fresnel = pow(1.0 - abs(vNormal.z), 1.6);

    vec3 color = fireRamp(vAge) * (1.0 + fresnel * 0.6);

    float coreBoost = smoothstep(0.25, 0.0, vAge) * 0.8;
    color += vec3(1.0, 0.9, 0.6) * coreBoost;

    float alpha = (1.0 - vAge * 0.85) * (0.55 + fresnel * 0.45);
    alpha *= smoothstep(1.0, 0.8, vAge);

    gl_FragColor = vec4(color, alpha);
}
`

export function ExplosionRenderer() {

    const ref = useRef()

    const geo = useMemo(() => {

        const g = new THREE.SphereGeometry(1, 12, 10)

        const ages = new Float32Array(MAX)
        const seeds = new Float32Array(MAX)

        for (let i = 0; i < MAX; i++) {
            seeds[i] = Math.random()
        }

        g.setAttribute("aAge", new THREE.InstancedBufferAttribute(ages, 1))
        g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1))

        return g

    }, [])

    const material = useMemo(() => new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    }), [])

    useFrame((_, dt) => {

        updateExplosionEmitter(dt)

        const ageAttr = geo.attributes.aAge

        let count = 0

        for (const e of explosions) {

            if (!e.alive)
                continue

            const t = 1 - e.life / e.maxLife

            // fast burst growth, then a slow lingering expansion as it fades
            const burstT = Math.min(t / 0.25, 1)
            const burstEase = 1 - Math.pow(1 - burstT, 3)
            const burstScale = THREE.MathUtils.lerp(0.25, 1.3, burstEase)
            const lingerScale = 1 + t * 0.45
            const s = e.size * burstScale * lingerScale

            pos.set(e.x, e.y, 0.2 + (count % 7) * 0.001)
            scaleVec.set(s, s, s)

            const seedAngle = (e.seed ?? count * 0.618) * Math.PI * 2
            
            axis.set(Math.sin(seedAngle), Math.cos(seedAngle), 0.4).normalize()
            rot.setFromAxisAngle(axis, t * 1.5 + seedAngle)
            matrix.compose(pos, rot, scaleVec)
            ref.current.setMatrixAt(count, matrix)
            ageAttr.array[count] = t

            count++

        }

        ref.current.count = count
        ref.current.instanceMatrix.needsUpdate = true
        ageAttr.needsUpdate = true

    })

    return (
        <instancedMesh
            ref={ref}
            args={[geo, material, MAX]}
            frustumCulled={false}
        />
    )

}