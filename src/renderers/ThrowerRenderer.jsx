// src/renderers/ThrowerRenderer.jsx

import * as THREE from "three"
import { useEffect, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"

import { useGameStore, SCREEN } from "../../store/gameStore.js"
import { throwerState } from "../ecs/weapons/weaponState/throwerState.js"
import { bossThrowerState } from "../ecs/weapons/weaponState/bossThrowerState.js"
import { startState } from "../state/startState.js"
import { getWeapon } from "../ecs/weapons/config/weapons.js"
import { bossAIQuery } from "../ecs/constants/queries.js"
import { BossAI } from "../ecs/constants/components.js"
import { createGPUParticles } from "../fx/gpu/gpuParticleUtils.js"

const SIZE = 64

const simVertex = /* glsl */ `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const simFragment = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D uPosTex;
uniform vec2 uOriginA, uOriginB, uDir;

uniform float uDelta, uTime, uEmitting;
uniform float uConeAngle, uRange, uTravelTime;
uniform float uTurbulence, uMist;
uniform float uSpreadPower, uCoreTightness;

void main() {
    vec4 p = texture2D(uPosTex, vUv);

    vec2 pos = p.xy;
    float life = p.z;
    float seed = p.w;

    float maxLife =
        uTravelTime * (0.88 + seed * 0.24);

    if (life > 0.0) {
        float age = clamp(
            1.0 - life / max(maxLife, 0.001),
            0.0,
            1.0
        );

        float spreadT = pow(age, uSpreadPower);
        float hold = mix(
            0.02,
            0.12,
            1.0 - uCoreTightness
        );

        float angle =
            (seed - 0.5) *
            uConeAngle *
            mix(hold, 1.0, spreadT);

        float c = cos(angle);
        float s = sin(angle);

        vec2 dir = vec2(
            uDir.x * c - uDir.y * s,
            uDir.x * s + uDir.y * c
        );

        float speed =
            uRange / max(uTravelTime, 0.05);

        vec2 turbulence = vec2(
            sin(pos.y * 2.4 + uTime * 5.6),
            cos(pos.x * 2.4 - uTime * 5.6)
        );

        turbulence *=
            uTurbulence *
            pow(age, uSpreadPower * 0.85) *
            mix(1.0, 0.6, uMist);

        vec2 radial =
            vec2(-uDir.y, uDir.x) *
            (seed - 0.5) *
            spreadT * 1.35;

        pos += (
            dir * speed +
            turbulence +
            radial
        ) * uDelta;

        life -= uDelta;

        if (life <= 0.0) {
            life = -(0.012 + seed * 0.06);
        }
    } else {
        life += uDelta;

        if (life >= 0.0) {
            if (uEmitting > 0.5) {
                float jitter =
                    0.008 +
                    (1.0 - uCoreTightness) * 0.01;

                vec2 offset = vec2(
                    sin(seed * 78.233 + uTime * 0.1),
                    cos(seed * 45.164 - uTime * 0.07)
                ) * jitter;

                vec2 origin =
                    fract(seed * 173.11) < 0.5
                        ? uOriginA
                        : uOriginB;

                pos = origin + offset;
                life = maxLife;
            } else {
                life = -(0.02 + seed * 0.97);
            }
        }
    }

    gl_FragColor = vec4(pos, life, seed);
}
`

const renderVertex = /* glsl */ `
attribute vec2 particleUv;

uniform sampler2D uPosTex;
uniform float uSize, uSizeMult;
uniform float uTravelTime, uSpreadPower;

varying float vLife, vSeed;

void main() {
    vec4 p = texture2D(uPosTex, particleUv);

    vLife = p.z;
    vSeed = p.w;

    float maxLife =
        uTravelTime * (0.88 + vSeed * 0.24);

    float age = clamp(
        1.0 - vLife / max(maxLife, 0.001),
        0.0,
        1.0
    );

    float growth = mix(
        0.40,
        1.75,
        pow(age, uSpreadPower * 0.7)
    );

    vec4 mv = modelViewMatrix *
        vec4(p.xy, 0.0, 1.0);

    gl_PointSize =
        uSize * uSizeMult * growth *
        (44.0 / max(-mv.z, 0.001));

    gl_Position = projectionMatrix * mv;
}
`

const renderFragment = /* glsl */ `
precision highp float;

varying float vLife, vSeed;

uniform vec3 uColorLow, uColorMid, uColorHigh;
uniform float uTravelTime, uMist, uFlicker;

void main() {
    if (vLife <= 0.0) discard;

    float d = length(gl_PointCoord - 0.5);

    if (d > 0.5) discard;

    float maxLife =
        uTravelTime * (0.88 + vSeed * 0.24);

    float t = clamp(
        vLife / max(maxLife, 0.001),
        0.0,
        1.0
    );

    float soft =
        1.0 - smoothstep(0.06, 0.5, d);

    float fire =
        soft *
        clamp(t * 2.4, 0.0, 1.0) *
        mix(0.30, 0.98, t);

    float mist =
        soft * soft *
        clamp(t * 1.7, 0.0, 1.0) *
        mix(0.07, 0.44, t);

    float alpha = mix(fire, mist, uMist);

    vec3 color = mix(
        uColorLow,
        uColorMid,
        smoothstep(0.0, 0.28, t)
    );

    color = mix(
        color,
        uColorHigh,
        smoothstep(0.42, 0.90, t)
    );

    float flicker =
        1.0 - uFlicker +
        uFlicker * (
            0.72 +
            0.28 * sin(
                vSeed * 67.0 +
                t * 30.0 +
                vLife * 14.0
            )
        );

    gl_FragColor = vec4(
        color * flicker,
        alpha
    );
}
`

function getThrower(source) {
    if (source === "player") {
        const weapon = getWeapon(startState.currentWeapon)

        return {
            state: throwerState,
            weapon,
            active:
                weapon?.category === "thrower" &&
                throwerState.active,
        }
    }

    for (const id of bossAIQuery()) {
        const weapon = getWeapon(BossAI.weapon[id])

        if (weapon?.category === "thrower") {
            return {
                state: bossThrowerState,
                weapon,
                active: bossThrowerState.active,
            }
        }
    }

    return {
        state: bossThrowerState,
        weapon: null,
        active: false,
    }
}

function applyWeapon(gpu, weapon) {
    if (weapon?.category !== "thrower") return

    const s = gpu.sim.uniforms
    const r = gpu.render.uniforms

    const speed = Math.max(
        weapon.particleSpeedMult ?? 1,
        0.12
    )

    const travelTime = 0.5 / speed
    const mist = weapon.particleMist ? 1 : 0
    const spread = Math.max(
        0.1,
        weapon.particleSpreadPower ?? 2.2
    )

    s.uTravelTime.value = travelTime
    r.uTravelTime.value = travelTime

    s.uTurbulence.value =
        weapon.particleTurbulence ?? 0.35

    s.uMist.value = mist
    r.uMist.value = mist

    s.uSpreadPower.value = spread
    r.uSpreadPower.value = spread

    s.uCoreTightness.value = THREE.MathUtils.clamp(
        weapon.particleCoreTightness ?? 0.85,
        0,
        1
    )

    r.uSizeMult.value =
        weapon.particleSizeMult ?? 1

    r.uFlicker.value =
        weapon.particleFlicker ?? 0.1

    r.uColorLow.value
        .set(weapon.haloColor ?? "#1e4a6e")
        .multiplyScalar(0.55)
        .lerp(
            new THREE.Color("#0a1a2e"),
            0.35
        )

    r.uColorMid.value.set(
        weapon.glowColor ?? "#3a7a9e"
    )

    r.uColorHigh.value.set(
        weapon.color ?? "#6eb6e8"
    )
}

export function ThrowerRenderer({
    source = "player",
    size = 10,
}) {
    const { gl } = useThree()

    const pointsRef = useRef(null)
    const gpuRef = useRef(null)
    const remainingRef = useRef(0)

    useEffect(() => {
        const gpu = createGPUParticles({
            size: SIZE,
            simVertex,
            simFragment,
            renderVertex,
            renderFragment,

            simUniforms: {
                uOriginA: new THREE.Vector2(),
                uOriginB: new THREE.Vector2(),
                uDir: new THREE.Vector2(0, 1),
                uDelta: 0,
                uTime: 0,
                uEmitting: 0,
                uConeAngle: 0.55,
                uRange: 6,
                uTravelTime: 0.5,
                uTurbulence: 0.35,
                uMist: 0,
                uSpreadPower: 2.2,
                uCoreTightness: 0.85,
            },

            renderUniforms: {
                uSize: size,
                uSizeMult: 1,
                uTravelTime: 0.5,
                uSpreadPower: 2.2,
                uMist: 0,
                uFlicker: 0.1,
                uColorLow: new THREE.Color("#0a1a2e"),
                uColorMid: new THREE.Color("#1e4a6e"),
                uColorHigh: new THREE.Color("#6eb6e8"),
            },
        })

        gpuRef.current = gpu

        if (pointsRef.current) {
            pointsRef.current.geometry = gpu.geometry
            pointsRef.current.material = gpu.render
        }

        return () => {
            gpuRef.current = null

            if (pointsRef.current) {
                pointsRef.current.visible = false
            }

            gpu.dispose()
        }
    }, [])

    useFrame((_, delta) => {
        const gpu = gpuRef.current
        const points = pointsRef.current

        if (!gpu || !points) return

        const game = useGameStore.getState()

        if (game.screen !== SCREEN.PLAY) {
            points.visible = false
            return
        }

        if (game.paused) return

        const dt = Math.min(Math.max(delta, 0), 0.05)

        if (dt <= 0) return

        const { state, weapon, active } =
            getThrower(source)

        applyWeapon(gpu, weapon)

        const s = gpu.sim.uniforms
        const r = gpu.render.uniforms

        // Maximum lifespan includes the seed variation.
        const maxLife = s.uTravelTime.value * 1.12

        if (active) {
            remainingRef.current = maxLife + 0.1
        } else {
            remainingRef.current = Math.max(
                0,
                remainingRef.current - dt
            )
        }

        if (!active && remainingRef.current <= 0) {
            points.visible = false
            return
        }

        gpu.time += dt

        s.uDelta.value = dt
        s.uTime.value = gpu.time
        s.uEmitting.value = active ? 1 : 0

        r.uSize.value = size

        if (active) {
            s.uOriginA.value.set(
                state.originAX ?? state.originX ?? 0,
                state.originAY ?? state.originY ?? 0
            )

            s.uOriginB.value.set(
                state.originBX ?? state.originX ?? 0,
                state.originBY ?? state.originY ?? 0
            )

            const dx = state.dirX ?? 0
            const dy = state.dirY ?? 1

            if (dx * dx + dy * dy > 1e-8) {
                s.uDir.value.set(dx, dy).normalize()
            }

            s.uConeAngle.value =
                (state.coneAngle ?? 0.55) * 0.95

            s.uRange.value = Math.max(
                0,
                state.range ?? state.length ?? 6
            )
        }

        gpu.update(gl)
        points.visible = true
    })

    return (
        <points
            ref={pointsRef}
            visible={false}
            frustumCulled={false}
            dispose={null}
        />
    )
}
