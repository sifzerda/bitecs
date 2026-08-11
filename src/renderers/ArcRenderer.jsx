// src/renderers/ArcRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { laserState } from '../ecs/weapons/weaponState/laserState.js'
import { bossLaserState } from '../ecs/weapons/weaponState/bossLaserState.js'
import { activeArcs } from '../ecs/pools/arcPool.js'

import { Arc, ArcPointsX, ArcPointsY, BossAI } from '../ecs/constants/components.js'

import { gameState } from '../state/gameState.js'
import { getWeapon } from '../ecs/weapons/config/weapons.js'
import { bossAIQuery } from '../ecs/constants/queries.js'

const MAX_BEAMS = 3
const MAX_ARCS = 24
const MAX_POINTS_PER_ARC = 64

const HIT_EPSILON = 0.01

// ---------------------------------------------------------------------------
// Primary bolt shader
// ---------------------------------------------------------------------------

const boltVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const boltFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec3 uCore;
uniform vec3 uGlow;
uniform vec3 uHalo;
uniform vec3 uAccentA;
uniform vec3 uAccentB;
uniform float uSeed;
uniform float uThicknessRatio;

// ---------------------------------------------------------------------------
// Cheap 1D hash
// ---------------------------------------------------------------------------

float hash(float n) {
    return fract(sin(n) * 43758.5453);
}

// ---------------------------------------------------------------------------
// Cheap interpolated noise
// ---------------------------------------------------------------------------

float noise(float x, float seed) {

    float i = floor(x);
    float f = fract(x);

    // Smooth interpolation.
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i + seed);
    float b = hash(i + seed + 1.0);

    return mix(a, b, f);
}

// ---------------------------------------------------------------------------
// Fractal noise
//
// Stacks a few octaves so a path gets both a large sweeping wander AND
// small chaotic kinks, instead of one smooth wave. This is what gives real
// lightning its torn, fractured look rather than a drawn curve.
// ---------------------------------------------------------------------------

float fbm(float x, float seed) {

    float total = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for (int i = 0; i < 4; i++) {

        total +=
            (noise(x * frequency, seed + float(i) * 91.7) - 0.5) *
            amplitude;

        amplitude *= 0.48;
        frequency *= 2.4;
    }

    return total;
}

// ---------------------------------------------------------------------------
// Main bolt path
// ---------------------------------------------------------------------------

float boltPath(float y, float seed) {

    float fade = smoothstep(0.0, 0.06, y);

    return fbm(y * 6.0, seed * 31.0) * 0.55 * fade;
}

// ---------------------------------------------------------------------------
// Fragment
// ---------------------------------------------------------------------------

void main() {

    float y = vUv.y;
    float x = vUv.x - 0.5;

    float thickness =
        max(uThicknessRatio, 0.001);

    // Edge jitter - real bolt edges are torn, not perfectly smooth.
    float edgeJitter =
        0.85 + 0.3 * noise(y * 18.0, uSeed * 3.0);

    float coreWidth =
        thickness * 0.38 * edgeJitter;

    float glowStrength =
        0.58 / thickness;

    float haloStrength =
        glowStrength * 0.45;

    // -----------------------------------------------------------------------
    // Main bolt
    // -----------------------------------------------------------------------

    float path =
        boltPath(y, uSeed);

    float distanceToPath =
        abs(x - path);

    float core =
        1.0 -
        smoothstep(
            0.0,
            coreWidth,
            distanceToPath
        );

    float glow =
        exp(
            -distanceToPath *
            glowStrength
        );

    float halo =
        exp(
            -distanceToPath *
            haloStrength
        );

    // -----------------------------------------------------------------------
    // Branch filaments
    //
    // Five thin, zigzagging tendrils instead of two smooth ones, kept in
    // their own accumulators so they can be tinted independently of the
    // weapon's core color - real tendrils read white/lavender even when
    // the main channel itself is colored.
    // -----------------------------------------------------------------------

    float filamentCoverageCore = 0.0;
    float filamentCoverageGlow = 0.0;
    vec3 filamentColorAccum = vec3(0.0);

    for (int i = 0; i < 5; i++) {

        float fi = float(i);

        float branchSeed =
            uSeed * (17.0 + fi * 13.0) +
            fi * 29.0;

        float branchStart =
            0.06 +
            hash(branchSeed) * 0.62;

        float branchLength =
            0.20 +
            hash(branchSeed + 11.0) * 0.55;

        float branchDirection =
            hash(branchSeed + 23.0) * 2.0 - 1.0;

        float branchT =
            clamp(
                (y - branchStart) /
                max(branchLength, 0.001),
                0.0,
                1.0
            );

        float branchMask =
            step(branchStart, y) *
            (
                1.0 -
                smoothstep(
                    branchStart + branchLength,
                    branchStart + branchLength + 0.04,
                    y
                )
            );

        // Sweeping drift plus its own fine-scale kinks - this is what
        // makes the tendril zigzag instead of just curving away cleanly.
        float branchWander =
            branchDirection * branchT * 0.5 +
            fbm(y * 32.0 + fi * 4.0, branchSeed * 5.0) *
                0.14 * branchT;

        float branchPath =
            path + branchWander;

        float branchDistance =
            abs(x - branchPath);

        float taper =
            1.0 - branchT;

        float branchWidth =
            mix(
                coreWidth * 0.05,
                coreWidth * 0.20,
                taper
            );

        float branchCore =
            (
                1.0 -
                smoothstep(
                    0.0,
                    branchWidth,
                    branchDistance
                )
            ) *
            branchMask *
            taper;

        float branchGlow =
            exp(
                -branchDistance *
                glowStrength * 1.8
            ) *
            branchMask *
            taper *
            0.55;

        // Pick a color per branch - mostly white/lavender like real
        // filaments, with some branches carrying a turquoise or cyan tint
        // so color threads weave through the tendrils instead of reading
        // as one flat hue.
        float tintPick =
            hash(branchSeed + 47.0);

        vec3 branchTint =
            tintPick < 0.45
                ? vec3(1.0)
                : tintPick < 0.72
                    ? uAccentA
                    : uAccentB;

        vec3 branchColor =
            mix(uGlow, branchTint, 0.7);

        filamentColorAccum +=
            branchColor *
            (branchCore * 1.25 + branchGlow * 0.55);

        filamentCoverageCore =
            min(1.0, filamentCoverageCore + branchCore);

        filamentCoverageGlow =
            min(1.0, filamentCoverageGlow + branchGlow);
    }

    // -----------------------------------------------------------------------
    // Energy animation
    // -----------------------------------------------------------------------

    float streak =
        fract(
            y * 6.0 -
            uTime * 3.0
        );

    streak =
        smoothstep(0.0, 0.5, streak) *
        smoothstep(1.0, 0.5, streak);

    float energy =
        0.78 +
        0.22 * streak;

    // Fibrous texture across the channel - breaks up the flat gradient
    // into something closer to the mottled, plasma-like core of a real
    // strike, instead of a clean smooth falloff.
    float coreTexture =
        0.85 +
        0.3 * noise(y * 40.0 + x * 9.0, uSeed * 7.0);

    // Color weaving - drifting streaks of turquoise and cyan woven through
    // the glow, layered over the weapon's base color rather than replacing
    // it, so the existing dark purplish-blue still reads as the base hue.
    float colorWeave =
        noise(y * 8.0 + x * 2.5, uSeed * 41.0);

    float weaveMask =
        smoothstep(0.4, 0.75, noise(y * 4.0, uSeed * 53.0));

    // Small global flicker.
    float flicker =
        0.94 +
        0.06 *
        sin(
            uTime * 55.0 +
            y * 32.0 +
            uSeed * 10.0
        );

    // -----------------------------------------------------------------------
    // Color
    // -----------------------------------------------------------------------

    vec3 weaveColor =
        mix(uAccentA, uAccentB, colorWeave);

    vec3 color =
          uCore * core * 1.45 * coreTexture
        + uGlow * glow * 0.85 * energy
        + uHalo * halo * 0.32
        + weaveColor * weaveMask * (glow * 0.55 + halo * 0.45) * energy
        + filamentColorAccum;

    color *= flicker;

    // -----------------------------------------------------------------------
    // Alpha
    // -----------------------------------------------------------------------

    float alpha =
        clamp(
            core +
            glow * 0.78 +
            halo * 0.38 +
            filamentCoverageCore * 0.9 +
            filamentCoverageGlow * 0.45,
            0.0,
            1.0
        );

    // Fade at both ends.
    alpha *=
        smoothstep(
            0.0,
            0.035,
            y
        );

    alpha *=
        smoothstep(
            1.0,
            0.965,
            y
        );

    gl_FragColor =
        vec4(color, alpha);
}
`

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createBoltMaterial() {
    return new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,

        uniforms: {
            uTime: { value: 0 },
            uCore: { value: new THREE.Color() },
            uGlow: { value: new THREE.Color() },
            uHalo: { value: new THREE.Color() },
            uAccentA: { value: new THREE.Color('#30e0c0') },
            uAccentB: { value: new THREE.Color('#40f0ff') },
            uSeed: { value: Math.random() },
            uThicknessRatio: { value: 0.1 },
        },

        vertexShader: boltVertexShader,
        fragmentShader: boltFragmentShader,
    })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArcRenderer({
    source = 'player',
    renderChainLinks = source === 'player',
}) {

    // -----------------------------------------------------------------------
    // Static bolt resources
    // -----------------------------------------------------------------------

    const boltGeometry = useMemo(() => {
        const geometry = new THREE.PlaneGeometry(1, 1)

        // Origin at the start of the bolt.
        geometry.translate(0, 0.5, 0)

        return geometry
    }, [])

    const boltMaterials = useMemo(
        () => Array.from(
            { length: MAX_BEAMS },
            createBoltMaterial
        ),
        []
    )

    const boltMeshes = useRef(
        Array(MAX_BEAMS).fill(null)
    )

    // Independent randomization state per bolt.
    const jagState = useRef(
        Array.from(
            { length: MAX_BEAMS },
            () => ({
                timer: Math.random() * 0.07,
                seed: Math.random(),
            })
        )
    )

    // Cache the current player weapon.
    const weaponCache = useRef({
        id: -1,
        weapon: null,
    })

    // Cache boss weapon/entity.
    const bossCache = useRef({
        entity: -1,
        weaponId: -1,
        weapon: null,
    })

    // Reusable hit data.
    const hitData = useRef(
        Array.from(
            { length: MAX_BEAMS },
            () => ({
                dirX: 0,
                dirY: 0,
                hitT: 0,
            })
        )
    )

    // -----------------------------------------------------------------------
    // Chain-lightning line pool
    // -----------------------------------------------------------------------

    const chainLines = useMemo(() => {

        const pool = new Array(MAX_ARCS)

        for (let i = 0; i < MAX_ARCS; i++) {

            const geometry = new THREE.BufferGeometry()

            const positions =
                new Float32Array(MAX_POINTS_PER_ARC * 3)

            const positionAttribute =
                new THREE.BufferAttribute(positions, 3)

            positionAttribute.setUsage(
                THREE.DynamicDrawUsage
            )

            geometry.setAttribute(
                'position',
                positionAttribute
            )

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

            const line = new THREE.Line(
                geometry,
                material
            )

            line.frustumCulled = false

            line.userData.positionAttribute =
                positionAttribute

            line.userData.positions =
                positions

            line.userData.drawCount = 0
            line.userData.version = -1

            line.userData.r = -1
            line.userData.g = -1
            line.userData.b = -1

            pool[i] = line
        }

        return pool

    }, [])

    // -----------------------------------------------------------------------
    // Data collection
    //
    // NOTE: origin is no longer returned here. Both laserState and
    // bossLaserState now carry a PER-BEAM origin array (originX[]/originY[]),
    // populated upstream in laserSystem.js/bossLaserSystem.js — including the
    // twin-gun split when a weapon's beam emission config has gunGap set.
    // ArcRenderer reads laser.originX[slot]/laser.originY[slot] directly in
    // the frame loop below, the same way LaserRenderer.jsx does, so a jagged
    // twin-gun weapon automatically renders two parallel bolts.
    // -----------------------------------------------------------------------

    const updatePlayerData = () => {

        const cache = weaponCache.current
        const weaponId = gameState.currentWeapon

        if (cache.id !== weaponId) {
            cache.id = weaponId
            cache.weapon = getWeapon(weaponId)
        }

        const weapon = cache.weapon

        if (!weapon) {
            return {
                active: false,
                weapon: null,
            }
        }

        const active =
            weapon.category === 'beam' &&
            weapon.jagged === true &&
            laserState.active &&
            laserState.beamCount > 0

        return {
            active,
            weapon,
        }
    }

    const updateBossData = () => {

        const bosses = bossAIQuery()

        if (
            bosses.length === 0 ||
            !bossLaserState.active ||
            bossLaserState.beamCount === 0
        ) {
            return {
                active: false,
                weapon: null,
            }
        }

        const bossId = bosses[0]
        const bossWeaponId = BossAI.weapon[bossId]
        const cache = bossCache.current

        if (
            cache.entity !== bossId ||
            cache.weaponId !== bossWeaponId
        ) {
            cache.entity = bossId
            cache.weaponId = bossWeaponId
            cache.weapon = getWeapon(bossWeaponId)
        }

        const weapon = cache.weapon

        if (!weapon?.jagged) {
            return {
                active: false,
                weapon: null,
            }
        }

        return {
            active:
                bossLaserState.beamCount > 0,
            weapon,
        }
    }

    // -----------------------------------------------------------------------
    // Frame update
    // -----------------------------------------------------------------------

    useFrame((state, delta) => {

        const time = state.clock.elapsedTime

        const data =
            source === 'player'
                ? updatePlayerData()
                : updateBossData()

        const {
            active,
            weapon,
        } = data

        // -------------------------------------------------------------------
        // Primary jagged bolts
        // -------------------------------------------------------------------

        const laser =
            source === 'player'
                ? laserState
                : bossLaserState

        const beamCount =
            active
                ? Math.min(laser.beamCount, MAX_BEAMS)
                : 0

        for (let slot = 0; slot < MAX_BEAMS; slot++) {

            const mesh = boltMeshes.current[slot]
            if (!mesh) continue

            const material =
                boltMaterials[slot]

            // Don't update inactive bolts.
            if (slot >= beamCount) {

                if (mesh.visible)
                    mesh.visible = false

                continue
            }

            const hitT = laser.hitT[slot]

            if (hitT <= HIT_EPSILON) {

                mesh.visible = false
                continue
            }

            mesh.visible = true

            // ---------------------------------------------------------------
            // Jagged animation
            // ---------------------------------------------------------------

            const js = jagState.current[slot]

            js.timer -= delta

            if (js.timer <= 0) {

                js.seed = Math.random()

                js.timer =
                    0.04 +
                    Math.random() * 0.03
            }

            material.uniforms.uTime.value = time
            material.uniforms.uSeed.value = js.seed

            // ---------------------------------------------------------------
            // Geometry transform
            //
            // originX/originY are now read per-slot (twin-gun aware) rather
            // than as one shared origin for every bolt.
            // ---------------------------------------------------------------

            const dirX = laser.dirX[slot]
            const dirY = laser.dirY[slot]

            const length = hitT

            const angle =
                Math.atan2(dirY, dirX) -
                Math.PI * 0.5

            const width =
                Math.max(
                    length * 0.30,
                    weapon.beamWidth * 10
                )

            const thicknessRatio =
                weapon.beamWidth / width

            material.uniforms.uThicknessRatio.value =
                thicknessRatio

            mesh.position.set(
                laser.originX[slot],
                laser.originY[slot],
                0.02
            )

            mesh.rotation.z = angle

            mesh.scale.set(
                width,
                length,
                1
            )

            // Only update colors if necessary.
            const core = material.uniforms.uCore.value
            const glow = material.uniforms.uGlow.value
            const halo = material.uniforms.uHalo.value
            const accentA = material.uniforms.uAccentA.value
            const accentB = material.uniforms.uAccentB.value

            if (core.getHexString() !== weapon.color.slice(1)) {
                core.set(weapon.color)
            }

            if (glow.getHexString() !== weapon.glowColor.slice(1)) {
                glow.set(weapon.glowColor)
            }

            if (halo.getHexString() !== weapon.haloColor.slice(1)) {
                halo.set(weapon.haloColor)
            }

            // Turquoise/cyan accent threads woven through the bolt. Falls
            // back to a sensible default so this works even for weapons
            // that haven't been given explicit accentColorA/B entries in
            // weapons.js yet.
            const accentAHex = weapon.accentColorA || '#30e0c0'
            const accentBHex = weapon.accentColorB || '#40f0ff'

            if (accentA.getHexString() !== accentAHex.slice(1)) {
                accentA.set(accentAHex)
            }

            if (accentB.getHexString() !== accentBHex.slice(1)) {
                accentB.set(accentBHex)
            }
        }

        // -------------------------------------------------------------------
        // Chain lightning
        // -------------------------------------------------------------------

        if (!renderChainLinks)
            return

        const arcs = activeArcs
        const arcCount =
            Math.min(arcs.length, MAX_ARCS)

        for (let i = 0; i < arcCount; i++) {

            const line = chainLines[i]
            const id = arcs[i]

            line.visible = true

            const count =
                Math.min(
                    Arc.pointCount[id],
                    MAX_POINTS_PER_ARC
                )

            const version =
                Arc.version[id]

            // Only copy point positions when the
            // ECS arc actually changed.
            if (line.userData.version !== version) {

                const positions =
                    line.userData.positions

                const xs =
                    ArcPointsX[id]

                const ys =
                    ArcPointsY[id]

                for (let p = 0; p < count; p++) {

                    const base = p * 3

                    positions[base] =
                        xs[p]

                    positions[base + 1] =
                        ys[p]

                    positions[base + 2] =
                        0.03
                }

                line.userData.positionAttribute.needsUpdate =
                    true

                line.userData.version =
                    version
            }

            if (
                line.userData.drawCount !== count
            ) {

                line.geometry.setDrawRange(
                    0,
                    count
                )

                line.userData.drawCount =
                    count
            }

            const life =
                Arc.maxLife[id] > 0
                    ? Arc.life[id] /
                      Arc.maxLife[id]
                    : 0

            line.material.opacity =
                life * Arc.intensity[id]

            const r = Arc.colorR[id]
            const g = Arc.colorG[id]
            const b = Arc.colorB[id]

            if (
                line.userData.r !== r ||
                line.userData.g !== g ||
                line.userData.b !== b
            ) {

                line.material.color.setRGB(
                    r,
                    g,
                    b
                )

                line.userData.r = r
                line.userData.g = g
                line.userData.b = b
            }
        }

        // Hide unused chain lines.
        for (let i = arcCount; i < MAX_ARCS; i++) {

            const line = chainLines[i]

            if (line.visible) {
                line.visible = false
                line.userData.version = -1
            }
        }
    })

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
        <>
            {boltMaterials.map((material, i) => (
                <mesh
                    key={`bolt-${i}`}
                    ref={(mesh) => {
                        boltMeshes.current[i] = mesh
                    }}
                    geometry={boltGeometry}
                    material={material}
                    frustumCulled={false}
                    visible={false}
                />
            ))}

            {renderChainLinks &&
                chainLines.map((line, i) => (
                    <primitive
                        key={`chain-${i}`}
                        object={line}
                    />
                ))}
        </>
    )
}