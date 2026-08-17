// src/renderers/LaserRenderer.jsx

import { useMemo, useRef, createRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { laserState } from '../ecs/weapons/weaponState/laserState.js'
import { bossLaserState } from '../ecs/weapons/weaponState/bossLaserState.js'
import { simState } from '../state/simState.js'
import { getWeapon } from '../ecs/weapons/config/weapons.js'
import { bossAIQuery } from '../ecs/constants/queries.js'
import { BossAI } from '../ecs/constants/components.js'

const MAX_BEAMS = 3 // covers prism's 3-beam fan AND twin-gun's 2 parallel beams

// -------------------------
// Source getters
// Both return the SAME shape: { active, weapon, beams }
// where beams = [{ originX, originY, dirX, dirY, hitT }, ...]
//
// Each beam now carries its OWN origin (not a shared scalar) so a
// twin-gun weapon can fire two parallel beams from two separate
// muzzle points, the same way spawnPlayerBullet/spawnBossBullet
// fire two bullets from two origins. Prism-style weapons that fan
// out from one point just repeat the same origin across all beams.
// -------------------------

function getPlayerLaserData() {

    const weapon = getWeapon(simState.currentWeapon)
    const active = weapon.category === "beam" && !weapon.jagged && laserState.active && laserState.beamCount > 0
    const beams = []

    if (active) {
        for (let i = 0; i < laserState.beamCount; i++) {
            beams.push({
                originX: laserState.originX[i],
                originY: laserState.originY[i],
                dirX: laserState.dirX[i],
                dirY: laserState.dirY[i],
                hitT: laserState.hitT[i],
            })
        }
    }

    return {
        active,
        weapon,
        beams,
    }
}

function getBossLaserData() {

    const bosses = bossAIQuery()

    if (bosses.length === 0 || !bossLaserState.active || bossLaserState.beamCount === 0) {
        return { active: false, weapon: null, beams: [] }
    }

    const weapon = getWeapon(BossAI.weapon[bosses[0]])

    if (!weapon || weapon.jagged) {
        return { active: false, weapon: null, beams: [] }
    }

    const beams = []

    for (let i = 0; i < bossLaserState.beamCount; i++) {
        if (bossLaserState.hitT[i] > 0.01) {
            beams.push({
                originX: bossLaserState.originX[i],
                originY: bossLaserState.originY[i],
                dirX: bossLaserState.dirX[i],
                dirY: bossLaserState.dirY[i],
                hitT: bossLaserState.hitT[i],
            })
        }
    }

    return {
        active: beams.length > 0,
        weapon,
        beams,
    }
}

const SOURCE_GETTERS = {
    player: getPlayerLaserData,
    boss: getBossLaserData,
}

// -------------------------
// Renderer
// -------------------------

export function LaserRenderer({ source = 'player' }) {

    const getLaserData = SOURCE_GETTERS[source]

    const laserRefs = useRef(Array.from({ length: MAX_BEAMS }, () => createRef()))

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
                uRainbow: { value: 0 },
                uSurgeSpeed: { value: 2.0 },
                uSurgeIntensity: { value: 0.6 },
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
uniform float uRainbow;
uniform float uSurgeSpeed;
uniform float uSurgeIntensity;

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main(){

    vec2 uv = vUv;
    float y = uv.y;
    float x = uv.x - 0.5;

    float w = abs(x) * 2.0;
    float core = 1.0 - smoothstep(0.0, 0.10, w);
    float glow = exp(-w * 4.0);
    float halo = exp(-w * 1.6);

    vec3 color;
    float alpha;

    if (uRainbow > 0.5) {

        float hue = fract(y * 1.4 - uTime * 0.35);
        float travel = y * uLength - uTime * uSurgeSpeed;
        float surge = 0.5 + 0.5 * sin(travel * 6.0);
        surge += 0.35 * sin(travel * 13.0 + 1.7);
        surge = clamp(surge, 0.0, 1.0);

        vec3 rainbowGlow = hsv2rgb(vec3(hue, 0.85, 1.0));
        vec3 rainbowHalo = hsv2rgb(vec3(fract(hue + 0.08), 0.9, 1.0));

        vec3 hotCore = mix(uCore, vec3(1.0), 0.6);

        float surgeBoost = 1.0 + surge * uSurgeIntensity;

        color = hotCore * core * 1.5
              + rainbowGlow * glow * 0.9 * surgeBoost
              + rainbowHalo * halo * 0.45 * surgeBoost;

        alpha = clamp(core * 1.0 + glow * 0.85 + halo * 0.45, 0.0, 1.0);

    } else {

        float scroll = fract(vUv.y * 6.0 - uTime * 3.0);
        float streak = smoothstep(0.0, 0.5, scroll) * smoothstep(1.0, 0.5, scroll);
        float energy = 0.75 + 0.25 * streak;

        float flicker = 0.92 + 0.08 * sin(uTime * 60.0 + vUv.y * 40.0);
        color = uCore * core * 1.4 + uGlow * glow * 0.85 * energy + uHalo * halo * 0.35;
        color *= flicker;
        alpha = clamp(core * 1.0 + glow * 0.8 + halo * 0.4, 0.0, 1.0);
    }

    alpha *= smoothstep(0.0, 0.03, vUv.y) * smoothstep(1.0, 0.97, vUv.y);

    gl_FragColor = vec4(color, alpha);
}
`
        }))
    ), [])

    useFrame((state) => {

        const t = state.clock.elapsedTime

        const { active, weapon, beams } = getLaserData()

        for (let slot = 0; slot < MAX_BEAMS; slot++) {

            const mesh = laserRefs.current[slot].current
            if (!mesh) continue

            const material = materials[slot]
            material.uniforms.uTime.value = t

            const beam = active ? beams[slot] : undefined
            const visible = !!beam && beam.hitT > 0.01

            mesh.visible = visible

            if (!visible) continue

            const { originX, originY, dirX, dirY, hitT: length } = beam

            const angle = Math.atan2(dirY, dirX) - Math.PI / 2
            const width = weapon.beamWidth * 5

            mesh.position.set(originX, originY, 0.02)
            mesh.rotation.set(0, 0, angle)
            mesh.scale.set(width, length, 1)

            material.uniforms.uLength.value = length
            material.uniforms.uCore.value.set(weapon.color)
            material.uniforms.uGlow.value.set(weapon.glowColor)
            material.uniforms.uHalo.value.set(weapon.haloColor)

            material.uniforms.uRainbow.value = weapon.rainbow ? 1 : 0
            material.uniforms.uSurgeSpeed.value = weapon.surgeSpeed ?? 2
            material.uniforms.uSurgeIntensity.value = weapon.surgeIntensity ?? 0.6
        }

    })

    return (
        <>
            {laserRefs.current.map((ref, i) => (
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