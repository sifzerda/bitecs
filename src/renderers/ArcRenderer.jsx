// src/renderers/ArcRenderer.jsx

import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

import { world } from "../ecs/constants/world.js"
import { useGameStore, SCREEN } from "../../store/gameStore.js"
import { laserState } from "../ecs/weapons/weaponState/laserState.js"
import { bossLaserState } from "../ecs/weapons/weaponState/bossLaserState.js"
import { activeArcs } from "../ecs/pools/arcPool.js"

import {
    Arc,
    ArcPointsX,
    ArcPointsY,
    ARC_MAX_POINTS,
    BossAI,
} from "../ecs/constants/components.js"

import { startState } from "../state/startState.js"
import { getWeapon } from "../ecs/weapons/config/weapons.js"
import { bossAIQuery } from "../ecs/constants/queries.js"

const MAX_BEAMS = 3
const MAX_ARCS = 24
const TAU = Math.PI * 2

const COLORS = {
    core: "#ffffff",
    glow: "#8040ff",
    halo: "#2010a0",
    accentA: "#30e0c0",
    accentB: "#40f0ff",
}

// ============================================================
// SIMPLIFIED LIGHTNING SHADER
// ============================================================

const vertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position =
        projectionMatrix *
        modelViewMatrix *
        vec4(position, 1.0);
}
`

const fragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform float uSeed;
uniform float uThickness;
uniform vec3 uCore;
uniform vec3 uGlow;
uniform vec3 uHalo;
uniform vec3 uAccentA;
uniform vec3 uAccentB;

float hash(float x) {
    return fract(sin(x) * 43758.5453);
}

float noise(float x, float seed) {
    float i = floor(x);
    float f = fract(x);
    f = f * f * (3.0 - 2.0 * f);

    return mix(
        hash(i + seed),
        hash(i + seed + 1.0),
        f
    ) - 0.5;
}

float jagged(float y, float seed) {
    return (
        noise(y * 8.0, seed) * 0.32 +
        noise(y * 23.0, seed + 19.0) * 0.12
    ) * smoothstep(0.0, 0.06, y);
}

void main() {
    float y = vUv.y;
    float x = vUv.x - 0.5;

    float thickness = max(uThickness, 0.001);
    float path = jagged(y, uSeed * 37.0);
    float distanceToBolt = abs(x - path);

    float core = 1.0 - smoothstep(
        0.0,
        thickness * 0.38,
        distanceToBolt
    );

    float glow = exp(
        -distanceToBolt * 0.65 / thickness
    );

    float halo = exp(
        -distanceToBolt * 0.28 / thickness
    );

    vec3 branches = vec3(0.0);
    float branchAlpha = 0.0;

    // Two branching filaments.
    for (int i = 0; i < 2; i++) {
        float fi = float(i);
        float seed = uSeed * 31.0 + fi * 17.0;

        float start = 0.12 + hash(seed) * 0.5;
        float length = 0.2 + hash(seed + 3.0) * 0.3;
        float t = (y - start) / length;

        if (t >= 0.0 && t <= 1.0) {
            float direction =
                hash(seed + 7.0) > 0.5 ? 1.0 : -1.0;

            float branchPath =
                path +
                direction * t * 0.25 +
                noise(y * 35.0, seed) * 0.08 * t;

            float d = abs(x - branchPath);
            float fade = 1.0 - t;

            float filament = (
                1.0 - smoothstep(
                    0.0,
                    thickness * 0.15,
                    d
                )
            ) * fade;

            float branchGlow =
                exp(-d * 1.5 / thickness) *
                fade * 0.4;

            vec3 tint = i == 0
                ? uAccentA
                : uAccentB;

            branches +=
                tint * (filament + branchGlow);

            branchAlpha += filament + branchGlow;
        }
    }

    float pulse =
        0.85 +
        0.15 * sin(y * 35.0 - uTime * 20.0);

    float flicker =
        0.95 +
        0.05 * sin(uTime * 55.0 + uSeed * 20.0);

    vec3 color =
        uCore * core * 1.5 +
        uGlow * glow * pulse +
        uHalo * halo * 0.35 +
        branches;

    color *= flicker;

    float alpha = clamp(
        core +
        glow * 0.75 +
        halo * 0.3 +
        branchAlpha,
        0.0,
        1.0
    );

    alpha *= smoothstep(0.0, 0.035, y);
    alpha *= 1.0 - smoothstep(0.965, 1.0, y);

    if (alpha < 0.002) discard;

    gl_FragColor = vec4(color, alpha);
}
`

// ============================================================
// HELPERS
// ============================================================

function createMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uSeed: { value: Math.random() },
            uThickness: { value: 0.1 },

            ...Object.fromEntries(
                Object.entries(COLORS).map(([key, value]) => [
                    `u${key[0].toUpperCase()}${key.slice(1)}`,
                    { value: new THREE.Color(value) },
                ])
            ),
        },

        vertexShader,
        fragmentShader,

        transparent: true,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
    })
}

function createChainLine() {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(ARC_MAX_POINTS * 3)

    const attribute = new THREE.BufferAttribute(positions, 3)
    attribute.setUsage(THREE.DynamicDrawUsage)

    geometry.setAttribute("position", attribute)
    geometry.setDrawRange(0, 0)

    const material = new THREE.LineBasicMaterial({
        color: "#1F51FF",
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
    })

    const line = new THREE.Line(geometry, material)

    line.visible = false
    line.frustumCulled = false

    line.userData.entity = -1
    line.userData.version = -1
    line.userData.count = -1

    return line
}

function beamValue(value, slot) {
    return typeof value === "number"
        ? value
        : value?.[slot] ?? 0
}

function getActiveWeapon(source, laser) {
    if (!laser.active || laser.beamCount <= 0) {
        return null
    }

    let weaponId

    if (source === "player") {
        weaponId = startState.currentWeapon
    } else {
        const boss = bossAIQuery()[0]

        if (boss === undefined) return null

        weaponId = BossAI.weapon[boss]
    }

    const weapon = getWeapon(weaponId)

    return weapon?.category === "beam" && weapon.jagged
        ? weapon
        : null
}

function updateColors(material, weapon) {
    const uniforms = material.uniforms

    const values = {
        uCore: weapon.color ?? COLORS.core,
        uGlow: weapon.glowColor ?? COLORS.glow,
        uHalo: weapon.haloColor ?? COLORS.halo,
        uAccentA: weapon.accentColorA ?? COLORS.accentA,
        uAccentB: weapon.accentColorB ?? COLORS.accentB,
    }

    const cache = material.userData.colors ??= {}

    for (const [name, value] of Object.entries(values)) {
        if (cache[name] === value) continue

        uniforms[name].value.set(value)
        cache[name] = value
    }
}

function updateChainLine(line, id) {
    const count = Math.min(
        Arc.pointCount[id],
        ARC_MAX_POINTS
    )

    const xs = ArcPointsX[id]
    const ys = ArcPointsY[id]

    if (!xs || !ys || count < 2) {
        line.visible = false
        line.userData.entity = -1
        return
    }

    line.visible = true

    const data = line.userData
    const version = Arc.version[id]

    if (
        data.entity !== id ||
        data.version !== version ||
        data.count !== count
    ) {
        const attribute = line.geometry.attributes.position
        const positions = attribute.array

        for (let i = 0; i < count; i++) {
            const j = i * 3

            positions[j] = xs[i]
            positions[j + 1] = ys[i]
            positions[j + 2] = 0.03
        }

        attribute.clearUpdateRanges()
        attribute.addUpdateRange(0, count * 3)
        attribute.needsUpdate = true

        line.geometry.setDrawRange(0, count)

        data.entity = id
        data.version = version
        data.count = count
    }

    const life = Arc.maxLife[id] > 0
        ? THREE.MathUtils.clamp(
            Arc.life[id] / Arc.maxLife[id],
            0,
            1
        )
        : 0

    line.material.opacity =
        life * Arc.intensity[id]

    line.material.color.setRGB(
        Arc.colorR[id],
        Arc.colorG[id],
        Arc.colorB[id]
    )
}

// ============================================================
// RENDERER
// ============================================================

export function ArcRenderer({
    source = "player",
    renderChainLinks = source === "player",
}) {
    const laser = source === "boss"
        ? bossLaserState
        : laserState

    const geometry = useMemo(() => {
        const g = new THREE.PlaneGeometry(1, 1)
        g.translate(0, 0.5, 0)
        return g
    }, [])

    const materials = useMemo(
        () => Array.from(
            { length: MAX_BEAMS },
            createMaterial
        ),
        []
    )

    const lines = useMemo(
        () => Array.from(
            { length: MAX_ARCS },
            createChainLine
        ),
        []
    )

    const meshes = useRef([])

    const jag = useRef(
        Array.from({ length: MAX_BEAMS }, () => ({
            seed: Math.random(),
            timer: Math.random() * 0.07,
        }))
    )

    useEffect(() => {
        return () => {
            geometry.dispose()

            materials.forEach((material) =>
                material.dispose()
            )

            lines.forEach((line) => {
                line.geometry.dispose()
                line.material.dispose()
            })
        }
    }, [geometry, materials, lines])

    useFrame((_, delta) => {
        const game = useGameStore.getState()

        if (
            game.screen === SCREEN.PLAY &&
            game.paused
        ) {
            return
        }

        const weapon = getActiveWeapon(source, laser)

        const beamCount = weapon
            ? Math.min(laser.beamCount, MAX_BEAMS)
            : 0

        const dt = Math.min(delta, 0.05)

        // ----------------------------------------------------
        // JAGGED BEAMS
        // ----------------------------------------------------

        for (let i = 0; i < MAX_BEAMS; i++) {
            const mesh = meshes.current[i]

            if (!mesh) continue

            const length = beamValue(laser.hitT, i)

            if (
                i >= beamCount ||
                length <= 0.01
            ) {
                mesh.visible = false
                continue
            }

            const dx = beamValue(laser.dirX, i)
            const dy = beamValue(laser.dirY, i)

            if (dx * dx + dy * dy < 1e-8) {
                mesh.visible = false
                continue
            }

            mesh.visible = true

            const material = materials[i]
            const state = jag.current[i]

            state.timer -= dt

            if (state.timer <= 0) {
                state.seed = Math.random()
                state.timer = 0.04 + Math.random() * 0.03
            }

            const beamWidth = weapon.beamWidth ?? 0.1
            const width = Math.max(
                length * 0.3,
                beamWidth * 10
            )

            mesh.position.set(
                beamValue(laser.originX, i),
                beamValue(laser.originY, i),
                0.02
            )

            mesh.rotation.z =
                Math.atan2(dy, dx) - Math.PI / 2

            mesh.scale.set(width, length, 1)

            material.uniforms.uTime.value =
                world.time.elapsed

            material.uniforms.uSeed.value =
                state.seed

            material.uniforms.uThickness.value =
                beamWidth / width

            updateColors(material, weapon)
        }

        // ----------------------------------------------------
        // CHAIN LIGHTNING
        // ----------------------------------------------------

        if (!renderChainLinks) return

        const count = Math.min(
            activeArcs.length,
            MAX_ARCS
        )

        for (let i = 0; i < count; i++) {
            updateChainLine(lines[i], activeArcs[i])
        }

        for (let i = count; i < MAX_ARCS; i++) {
            lines[i].visible = false
            lines[i].userData.entity = -1
        }
    })

    return (
        <>
            {materials.map((material, i) => (
                <mesh
                    key={i}
                    ref={(mesh) => {
                        meshes.current[i] = mesh
                    }}
                    geometry={geometry}
                    material={material}
                    visible={false}
                    frustumCulled={false}
                />
            ))}

            {renderChainLinks &&
                lines.map((line, i) => (
                    <primitive
                        key={i}
                        object={line}
                    />
                ))}
        </>
    )
}
