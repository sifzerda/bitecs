// src/renderers/LaserRenderer.jsx

import { useMemo, useRef } from 'react'
import { createRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { laserState } from '../state/laserState.js'
import { gameState } from '../state/gameState.js'
import { getWeapon } from '../ecs/constants/weapons.js'

const MAX_BEAMS = 3   // matches the highest beamCount across all beam weapons (prism beam)

export function LaserRenderer() {

    const beamRefs = useRef(
        Array.from({ length: MAX_BEAMS }, () => createRef())
    )

    const jagState = useRef(
        Array.from({ length: MAX_BEAMS }, () => ({ timer: 0, seed: Math.random() }))
    )

    const geometry = useMemo(() => {
        const geo = new THREE.PlaneGeometry(1, 1)
        geo.translate(0, 0.5, 0)
        return geo
    }, [])

    const materials = useMemo(() => (
        Array.from({ length: MAX_BEAMS }, () => new THREE.ShaderMaterial({

            transparent: true,
            depthWrite: false,
            depthTest: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            toneMapped: false,

            uniforms: {
                uTime: { value: 0 },
                uCore: { value: new THREE.Color('#ffffff') },
                uGlow: { value: new THREE.Color('#ffffff') },
                uHalo: { value: new THREE.Color('#ffffff') },
                uLength: { value: 1 },
                uJagged: { value: 0 },
                uSeed: { value: 0 },
                uThicknessRatio: { value: 0.1 }, // beamWidth / containerWidth — keeps line thickness constant in world space regardless of how wide the sway container is
            },

            vertexShader: /* glsl */`
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,

            fragmentShader: /* glsl */`
precision highp float;
varying vec2 vUv;

uniform float uTime;
uniform vec3 uCore;
uniform vec3 uGlow;
uniform vec3 uHalo;
uniform float uLength;
uniform float uJagged;
uniform float uSeed;
uniform float uThicknessRatio;

float hash1(vec2 p){
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float boltPath(float y, float seed){

float startFade = smoothstep(0.0, 0.06, y);

 // coarse layer — overall bolt shape
    float coarseCount = 7.0;
    float coarsePos = y * coarseCount;
    float coarseIndex = floor(coarsePos);
    float coarseFrac = fract(coarsePos);
    float ca = (hash1(vec2(coarseIndex, seed * 47.0)) - 0.5) * 0.30;
    float cb = (hash1(vec2(coarseIndex + 1.0, seed * 47.0)) - 0.5) * 0.30;
    float coarse = mix(ca, cb, coarseFrac);

    // fine layer — dense jagged detail riding on top of the coarse shape
    float fineCount = 40.0;
    float finePos = y * fineCount;
    float fineIndex = floor(finePos);
    float fineFrac = fract(finePos);
    float fa = (hash1(vec2(fineIndex, seed * 91.0 + 17.0)) - 0.5) * 0.09;
    float fb = (hash1(vec2(fineIndex + 1.0, seed * 91.0 + 17.0)) - 0.5) * 0.09;
    float fine = mix(fa, fb, fineFrac);

    return (coarse + fine) * startFade;
}

void main(){

    vec2 uv = vUv;
    float y = uv.y;
    float x = uv.x - 0.5;

    float core;
    float glow;
    float halo;

    if (uJagged > 0.5) {

        float coreThresh = uThicknessRatio * 0.4;
        float glowK = 0.70 / max(uThicknessRatio, 0.001);
        float haloK = glowK * 0.5;

        float mainPath = boltPath(y, uSeed);
        float wMain = abs(x - mainPath);

        core = 1.0 - smoothstep(0.0, coreThresh, wMain);
        glow = exp(-wMain * glowK);
        halo = exp(-wMain * haloK);

        for (int f = 0; f < 3; f++) {

            float fi = float(f);
            float fSeed = uSeed * (11.0 + fi * 6.3) + fi * 3.7;

            float forkStart = 0.10 + hash1(vec2(fSeed, 1.0)) * 0.55;
            float forkLen   = 0.18 + hash1(vec2(fSeed, 11.0)) * 0.30;
            float forkDir   = (hash1(vec2(fSeed, 22.0)) - 0.5) * 2.0;

            float t = clamp((y - forkStart) / max(forkLen, 0.001), 0.0, 1.0);
            float forkPath = mainPath + forkDir * t * 0.5;

            float mask = step(forkStart, y) * (1.0 - smoothstep(forkStart + forkLen, forkStart + forkLen + 0.05, y));
            float taper = 1.0 - t;

            float wF = abs(x - forkPath);
            float forkCoreThresh = mix(coreThresh * 0.3, coreThresh, taper);

            float coreF = (1.0 - smoothstep(0.0, forkCoreThresh, wF)) * mask * taper;
            float glowF = exp(-wF * glowK) * mask * taper;

            core = clamp(core + coreF, 0.0, 1.0);
            glow = clamp(glow + glowF, 0.0, 1.0);
        }

    } else {
        float w = abs(x) * 2.0;
        core = 1.0 - smoothstep(0.0, 0.10, w);
        glow = exp(-w * 4.0);
        halo = exp(-w * 1.6);
    }

    float scroll = fract(vUv.y * 6.0 - uTime * 3.0);
    float streak = smoothstep(0.0, 0.5, scroll) * smoothstep(1.0, 0.5, scroll);
    float energy = 0.75 + 0.25 * streak;

    float flicker = 0.92 + 0.08 * sin(uTime * 60.0 + vUv.y * 40.0);
    vec3 color = uCore * core * 1.4 + uGlow * glow * 0.85 * energy + uHalo * halo * 0.35;
    color *= flicker;
    float alpha = clamp(core * 1.0 + glow * 0.8 + halo * 0.4, 0.0, 1.0);
    alpha *= smoothstep(0.0, 0.03, vUv.y) * smoothstep(1.0, 0.97, vUv.y);

    gl_FragColor = vec4(color, alpha);
}
`
        }))
    ), [])

    useFrame((state, delta) => {

        const t = state.clock.elapsedTime
        const weapon = getWeapon(gameState.currentWeapon)
        const isBeamWeapon = weapon.category === "beam"
        const active = isBeamWeapon && laserState.active && laserState.hits && laserState.hits.length > 0
        const isJagged = !!weapon.jagged

        for (let slot = 0; slot < MAX_BEAMS; slot++) {

            const mesh = beamRefs.current[slot].current
            if (!mesh) continue

            const material = materials[slot]
            material.uniforms.uTime.value = t
            material.uniforms.uJagged.value = isJagged ? 1 : 0

            if (isJagged) {
                const js = jagState.current[slot]
                js.timer -= delta
                if (js.timer <= 0) {
                    js.seed = Math.random()
                    js.timer = 0.04 + Math.random() * 0.03
                }
                material.uniforms.uSeed.value = js.seed
            }

            const hitData = active ? laserState.hits[slot] : null
            const visible = !!hitData && hitData.hitT > 0.01

            mesh.visible = visible
            if (!visible) continue

            const dirX = hitData.dirX
            const dirY = hitData.dirY
            const length = hitData.hitT

            const angle = Math.atan2(dirY, dirX) - Math.PI / 2

            let width
            if (isJagged) {
                // container scales with beam length so the zigzag sway is a
                // proportion of the bolt's total length, matching real lightning —
                // floored so point-blank shots still have room to sway
                width = Math.max(length * 0.30, weapon.beamWidth * 10)
                material.uniforms.uThicknessRatio.value = weapon.beamWidth / width
            } else {
                width = weapon.beamWidth * 5.0
            }

            mesh.position.set(laserState.originX, laserState.originY, 0.02)
            mesh.rotation.set(0, 0, angle)
            mesh.scale.set(width, length, 1)

            material.uniforms.uLength.value = length
            material.uniforms.uCore.value.set(weapon.color)
            material.uniforms.uGlow.value.set(weapon.glowColor)
            material.uniforms.uHalo.value.set(weapon.haloColor)
        }

    })

    return (
        <>
            {beamRefs.current.map((ref, i) => (
                <mesh
                    key={i}
                    ref={ref}
                    geometry={geometry}
                    material={materials[i]}
                    frustumCulled={false}
                />
            ))}
        </>
    )
}