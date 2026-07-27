// src/renderers/LaserRenderer.jsx
// Straight-beam weapons only (lasergun, plasmabeam, any future non-jagged
// beam). Jagged beams (arcgun) are handled entirely by ArcRenderer instead —
// see that file for both the primary bolt and its chain-lightning segments.

import { useMemo, useRef, createRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { laserState } from '../ecs/weapons/weaponState/laserState.js'
import { bossLaserState } from '../ecs/weapons/weaponState/bossLaserState.js'
import { gameState } from '../state/gameState.js'
import { getWeapon } from '../ecs/weapons/config/weapons.js'
import { bossAIQuery } from '../ecs/constants/queries.js'
import { BossAI } from '../ecs/constants/components.js'

const MAX_BEAMS = 3 // covers prism's 3 simultaneous beams

// -------------------------
// Source adapters — only report active when the weapon is a non-jagged beam.
// Jagged beams are claimed by ArcRenderer's own adapters instead, so a
// weapon can never be drawn by both renderers at once.
// -------------------------

function getPlayerLaserData() {
    const weapon = getWeapon(gameState.currentWeapon)
    const active = weapon.category === "beam" && !weapon.jagged
        && laserState.active && laserState.hits?.length > 0
    return {
        active,
        originX: laserState.originX,
        originY: laserState.originY,
        weapon,
        hits: active ? laserState.hits : [],
    }
}

function getBossLaserData() {
    const bosses = bossAIQuery()
    if (bosses.length === 0 || !bossLaserState.active || !bossLaserState.hit) {
        return { active: false, originX: 0, originY: 0, weapon: null, hits: [] }
    }

    const weapon = getWeapon(BossAI.weapon[bosses[0]])
    if (weapon.jagged) return { active: false, originX: 0, originY: 0, weapon: null, hits: [] }

    const dx = bossLaserState.hitX - bossLaserState.originX
    const dy = bossLaserState.hitY - bossLaserState.originY
    const hitT = Math.hypot(dx, dy)

    if (hitT < 0.01) return { active: false, originX: 0, originY: 0, weapon: null, hits: [] }

    return {
        active: true,
        originX: bossLaserState.originX,
        originY: bossLaserState.originY,
        weapon,
        hits: [{ dirX: dx / hitT, dirY: dy / hitT, hitT }],
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

void main(){

    vec2 uv = vUv;
    float y = uv.y;
    float x = uv.x - 0.5;

    float w = abs(x) * 2.0;
    float core = 1.0 - smoothstep(0.0, 0.10, w);
    float glow = exp(-w * 4.0);
    float halo = exp(-w * 1.6);

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

    useFrame((state) => {

        const t = state.clock.elapsedTime
        const { active, originX, originY, weapon, hits } = getLaserData()

        for (let slot = 0; slot < MAX_BEAMS; slot++) {

            const mesh = laserRefs.current[slot].current
            if (!mesh) continue

            const material = materials[slot]
            material.uniforms.uTime.value = t

            const hitData = active ? hits[slot] : null
            const visible = !!hitData && hitData.hitT > 0.01

            mesh.visible = visible
            if (!visible) continue

            const dirX = hitData.dirX
            const dirY = hitData.dirY
            const length = hitData.hitT

            const angle = Math.atan2(dirY, dirX) - Math.PI / 2
            const width = weapon.beamWidth * 5.0

            mesh.position.set(originX, originY, 0.02)
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