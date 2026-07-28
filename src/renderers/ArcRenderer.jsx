// src/renderers/ArcRenderer.jsx

import { useMemo, useRef, createRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { laserState } from '../ecs/weapons/weaponState/laserState.js'
import { bossLaserState } from '../ecs/weapons/weaponState/bossLaserState.js'
import { activeArcs } from "../ecs/pools/arcPool.js"
import { Arc, ArcPointsX, ArcPointsY } from "../ecs/constants/components.js"
import { gameState } from '../state/gameState.js'
import { getWeapon } from '../ecs/weapons/config/weapons.js'
import { bossAIQuery } from '../ecs/constants/queries.js'
import { BossAI } from '../ecs/constants/components.js'

const MAX_BEAMS = 3       // headroom for a future multi-bolt jagged weapon
const MAX_ARCS = 24
const MAX_POINTS_PER_ARC = 64

// -------------------------

function getBossArcData() {

    const bosses = bossAIQuery()

    if (bosses.length === 0 || !bossLaserState.active || bossLaserState.beamCount === 0) {
        return {
            active: false,
            originX: 0,
            originY: 0,
            weapon: null,
            hits: [],
        }
    }

    const weapon = getWeapon(BossAI.weapon[bosses[0]])

    if (!weapon.jagged) {
        return {
            active: false,
            originX: 0,
            originY: 0,
            weapon: null,
            hits: [],
        }
    }

    const hits = []

    for (let i = 0; i < bossLaserState.beamCount; i++) {

        if (bossLaserState.hitT[i] <= 0.01)
            continue

        hits.push({
            dirX: bossLaserState.dirX[i],
            dirY: bossLaserState.dirY[i],
            hitT: bossLaserState.hitT[i],
        })
    }

    return {
        active: hits.length > 0,
        originX: bossLaserState.originX,
        originY: bossLaserState.originY,
        weapon,
        hits,
    }
}

export function ArcRenderer({ source = 'player', renderChainLinks = source === 'player' }) {

    const getArcData = source === "player"
        ? getPlayerArcData
        : getBossArcData
    const weaponCache = useRef({ id: -1, weapon: null })

    function getPlayerArcData() {

        if (weaponCache.current.id !== gameState.currentWeapon) {
            weaponCache.current.id = gameState.currentWeapon
            weaponCache.current.weapon = getWeapon(gameState.currentWeapon)
        }

        const weapon = weaponCache.current.weapon

        const active =
            weapon.category === "beam" &&
            !!weapon.jagged &&
            laserState.active &&
            laserState.beamCount > 0

        const hits = []

        if (active) {
            for (let i = 0; i < laserState.beamCount; i++) {

                if (laserState.hitT[i] <= 0.01)
                    continue

                hits.push({
                    dirX: laserState.dirX[i],
                    dirY: laserState.dirY[i],
                    hitT: laserState.hitT[i],
                })
            }
        }

        return {
            active,
            originX: laserState.originX,
            originY: laserState.originY,
            weapon,
            hits,
        }
    }
    // -------------------------
    // Primary jagged bolt — quad + jagged shader (moved from LaserRenderer)
    // -------------------------

    const boltRefs = useRef(Array.from({ length: MAX_BEAMS }, () => createRef()))
    const jagState = useRef(Array.from({ length: MAX_BEAMS }, () => ({ timer: 0, seed: Math.random() })))

    const boltGeometry = useMemo(() => {
        const geo = new THREE.PlaneGeometry(1, 1)
        geo.translate(0, 0.5, 0)
        return geo
    }, [])

    const boltMaterials = useMemo(() => (
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
                uSeed: { value: 0 },
                uThicknessRatio: { value: 0.1 },
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
uniform float uSeed;
uniform float uThicknessRatio;

float hash1(vec2 p){
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float boltPath(float y, float seed){
    float startFade = smoothstep(0.0, 0.06, y);

    float coarseCount = 7.0;
    float coarsePos = y * coarseCount;
    float coarseIndex = floor(coarsePos);
    float coarseFrac = fract(coarsePos);
    float ca = (hash1(vec2(coarseIndex, seed * 47.0)) - 0.5) * 0.30;
    float cb = (hash1(vec2(coarseIndex + 1.0, seed * 47.0)) - 0.5) * 0.30;
    float coarse = mix(ca, cb, coarseFrac);

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

    float coreThresh = uThicknessRatio * 0.4;
    float glowK = 0.70 / max(uThicknessRatio, 0.001);
    float haloK = glowK * 0.5;
    float mainPath = boltPath(y, uSeed);
    float wMain = abs(x - mainPath);

    float core = 1.0 - smoothstep(0.0, coreThresh, wMain);
    float glow = exp(-wMain * glowK);
    float halo = exp(-wMain * haloK);

    for (int f = 0; f < 3; f++) {

        float fi = float(f);
        float fSeed = uSeed * (11.0 + fi * 6.3) + fi * 3.7;
        float forkStart = 0.10 + hash1(vec2(fSeed, 1.0)) * 0.55;
        float forkLen = 0.18 + hash1(vec2(fSeed, 11.0)) * 0.30;
        float forkDir = (hash1(vec2(fSeed, 22.0)) - 0.5) * 2.0;
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

    // -------------------------
    // Chain-lightning line pool 
    // -------------------------

    const chainLines = useMemo(() => {
        const pool = []
        for (let i = 0; i < MAX_ARCS; i++) {
            const geometry = new THREE.BufferGeometry()
            const positions = new Float32Array(MAX_POINTS_PER_ARC * 3)
            const attribute = new THREE.BufferAttribute(positions, 3)
            attribute.setUsage(THREE.DynamicDrawUsage)
            geometry.setAttribute("position", attribute)
            geometry.setDrawRange(0, 0)

            const material = new THREE.LineBasicMaterial({
                color: '#1F51FF',
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                depthTest: false,
                toneMapped: false,
            })

            const line = new THREE.Line(geometry, material)
            line.frustumCulled = false
            line.userData.positionAttribute = attribute
            line.userData.positions = positions
            line.userData.drawCount = -1

            line.userData.version = -1

            line.userData.r = -1
            line.userData.g = -1
            line.userData.b = -1

            pool.push(line)
        }
        return pool
    }, [])

    useFrame((state, delta) => {

        // ---- primary bolt ----

        const t = state.clock.elapsedTime
        const { active, originX, originY, weapon, hits } = getArcData()

        for (let slot = 0; slot < MAX_BEAMS; slot++) {

            const mesh = boltRefs.current[slot].current
            if (!mesh) continue

            const material = boltMaterials[slot]
            material.uniforms.uTime.value = t

            const js = jagState.current[slot]
            js.timer -= delta
            if (js.timer <= 0) {
                js.seed = Math.random()
                js.timer = 0.04 + Math.random() * 0.03
            }
            material.uniforms.uSeed.value = js.seed

            const hitData = active ? hits[slot] : null
            const visible = !!hitData && hitData.hitT > 0.01

            mesh.visible = visible
            if (!visible) continue

            const dirX = hitData.dirX
            const dirY = hitData.dirY
            const length = hitData.hitT

            const angle = Math.atan2(dirY, dirX) - Math.PI / 2
            const width = Math.max(length * 0.30, weapon.beamWidth * 10)
            material.uniforms.uThicknessRatio.value = weapon.beamWidth / width

            mesh.position.set(originX, originY, 0.02)
            mesh.rotation.set(0, 0, angle)
            mesh.scale.set(width, length, 1)

            material.uniforms.uLength.value = length
            material.uniforms.uCore.value.set(weapon.color)
            material.uniforms.uGlow.value.set(weapon.glowColor)
            material.uniforms.uHalo.value.set(weapon.haloColor)
        }

        // ---- chain-lightning segments ----

        if (!renderChainLinks) return

        const arcs = activeArcs

        for (let i = 0; i < MAX_ARCS; i++) {

            const line = chainLines[i]

            if (i >= arcs.length) {
                line.visible = false
                line.userData.version = -1
                continue
            }

            const id = arcs[i]

            line.visible = true

            const count = Math.min(Arc.pointCount[id], MAX_POINTS_PER_ARC)

            const posAttr = line.userData.positionAttribute
            const arr = line.userData.positions

            const xs = ArcPointsX[id]
            const ys = ArcPointsY[id]

            if (line.userData.version !== Arc.version[id]) {

                for (let p = 0; p < count; p++) {

                    const base = p * 3

                    arr[base] = xs[p]
                    arr[base + 1] = ys[p]
                    arr[base + 2] = 0.03
                }
                posAttr.needsUpdate = true
                line.userData.version = Arc.version[id]
            }

            if (line.userData.drawCount !== count) {
                line.geometry.setDrawRange(0, count)
                line.userData.drawCount = count
            }

            const lifeT = Arc.life[id] / Arc.maxLife[id]

            line.material.opacity = lifeT * Arc.intensity[id]
            if (line.userData.r !== Arc.colorR[id] || line.userData.g !== Arc.colorG[id] || line.userData.b !== Arc.colorB[id]) {
                line.material.color.setRGB(Arc.colorR[id], Arc.colorG[id], Arc.colorB[id])
                line.userData.r = Arc.colorR[id]
                line.userData.g = Arc.colorG[id]
                line.userData.b = Arc.colorB[id]
            }
        }
    })

    return (
        <>
            {boltRefs.current.map((ref, i) => (
                <mesh key={`bolt-${i}`} ref={ref} geometry={boltGeometry} material={boltMaterials[i]} frustumCulled={false} />
            ))}
            {renderChainLinks && chainLines.map((line, i) => (
                <primitive key={`chain-${i}`} object={line} />
            ))}
        </>
    )
}