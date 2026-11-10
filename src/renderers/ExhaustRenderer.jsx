// src/renderers/ExhaustRenderer.jsx

import * as THREE from "three"
import { useEffect, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"

import { world } from "../ecs/constants/world.js"
import { useGameStore, SCREEN } from "../../store/gameStore.js"
import { exhaustSources } from "../fx/gpu/ExhaustState"
import { playerMotion } from "../ecs/systems/playerControlSystem.js"
import { createGPUParticles } from "../fx/gpu/gpuParticleUtils.js"

const SIZE = 128
const MAX_LIFE = 1

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
uniform vec2 uShipPos, uShipVel;

uniform float uShipRot, uDelta, uTime;
uniform float uEmitting, uNozzleOffset, uEngineGap;

void main() {
    vec4 p = texture2D(uPosTex, vUv);

    vec2 pos = p.xy;
    float life = p.z;
    float seed = p.w;

    float side = seed < 0.5 ? -1.0 : 1.0;

    vec2 backward = vec2(
        -sin(uShipRot),
        cos(uShipRot)
    );

    vec2 right = vec2(
        cos(uShipRot),
        sin(uShipRot)
    );

    if (life > 0.0) {
        life -= uDelta;

        float lifespan = 0.5 + seed * 0.5;
        float age = 1.0 - clamp(
            life / lifespan,
            0.0,
            1.0
        );

        vec2 turbulence = vec2(
            sin(pos.y * 0.05 + uTime * 1.5),
            cos(pos.x * 0.05 - uTime * 1.5)
        ) * 1.5;

        vec2 expansion =
            right * side * age * 0.9;

        float velocityFade =
            1.0 - smoothstep(0.0, 0.35, age);

        vec2 velocity =
            -uShipVel * 0.85 * velocityFade +
            turbulence +
            expansion;

        pos += velocity * uDelta;

        if (life <= 0.0) {
            life = -(0.05 + seed * 0.35);
        }
    } else {
        life += uDelta;

        if (life >= 0.0) {
            if (uEmitting > 0.5) {
                float jitter =
                    (fract(seed * 91.345) - 0.5) *
                    0.06;

                float offset =
                    side * uEngineGap + jitter;

                pos =
                    uShipPos +
                    backward * uNozzleOffset +
                    right * offset;

                life = 0.5 + seed * 0.5;
            } else {
                life = -(0.05 + seed * 0.90);
            }
        }
    }

    gl_FragColor = vec4(pos, life, seed);
}
`

const renderVertex = /* glsl */ `
attribute vec2 particleUv;

uniform sampler2D uPosTex;
uniform float uSize;

varying float vLife;
varying float vAge;
varying float vEnvelope;

void main() {
    vec4 p = texture2D(uPosTex, particleUv);

    vLife = p.z;

    float lifespan = 0.5 + p.w * 0.5;

    float lifeFrac = clamp(
        vLife / lifespan,
        0.0,
        1.0
    );

    vAge = 1.0 - lifeFrac;

    vEnvelope =
        smoothstep(0.0, 0.08, lifeFrac) *
        (1.0 - smoothstep(0.75, 1.0, vAge));

    float variance = mix(
        0.75,
        1.25,
        fract(p.w * 13.7)
    );

    vec4 mv = modelViewMatrix *
        vec4(p.xy, 0.0, 1.0);

    gl_PointSize =
        uSize *
        variance *
        vEnvelope *
        (40.0 / max(-mv.z, 0.001));

    gl_Position = projectionMatrix * mv;
}
`

const renderFragment = /* glsl */ `
precision highp float;

varying float vLife;
varying float vAge;
varying float vEnvelope;

uniform vec3 uHotCore;
uniform vec3 uFireColor;
uniform vec3 uSmokeColor;
uniform float uBoost;

void main() {
    if (vLife <= 0.0) discard;

    float d = length(gl_PointCoord - 0.5);

    if (d > 0.5) discard;

    float alpha =
        (1.0 - smoothstep(0.0, 0.5, d)) *
        clamp(vLife, 0.0, 1.0) *
        vEnvelope * 0.15;

    vec3 color = mix(
        uHotCore,
        uFireColor,
        smoothstep(0.0, 0.15, vAge)
    );

    color = mix(
        color,
        uSmokeColor,
        smoothstep(0.15, 1.0, vAge)
    );

    vec3 boost = mix(
        vec3(0.55, 0.95, 1.0),
        vec3(0.0, 0.55, 1.0),
        smoothstep(0.0, 0.2, vAge)
    );

    boost = mix(
        boost,
        vec3(0.03, 0.15, 1.0),
        smoothstep(0.2, 1.0, vAge)
    );

    color = mix(color, boost * 2.2, uBoost);

    gl_FragColor = vec4(color, alpha);
}
`

export default function ExhaustRenderer({
    size = 4,
    slot = 0,
    nozzleOffset = -0.7,
    engineGap = 0.15,
    hotCore = "#ff2614",
    fireColor = "#ff3308",
    smokeColor = "#04bfff",
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
                uShipPos: new THREE.Vector2(),
                uShipVel: new THREE.Vector2(),
                uShipRot: 0,
                uDelta: 0,
                uTime: 0,
                uEmitting: 0,
                uNozzleOffset: nozzleOffset,
                uEngineGap: engineGap,
            },

            renderUniforms: {
                uSize: size,
                uHotCore: new THREE.Color(hotCore),
                uFireColor: new THREE.Color(fireColor),
                uSmokeColor: new THREE.Color(smokeColor),
                uBoost: 0,
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

        const ship = exhaustSources.find(
            (source) => source.slot === slot
        )

        const emitting = !!ship?.emitting
        const dt = Math.min(Math.max(delta, 0), 0.05)

        if (dt <= 0) return

        if (emitting) {
            remainingRef.current = MAX_LIFE
        } else {
            remainingRef.current = Math.max(
                0,
                remainingRef.current - dt
            )
        }

        if (!emitting && remainingRef.current <= 0) {
            points.visible = false
            return
        }

        const s = gpu.sim.uniforms
        const r = gpu.render.uniforms

        s.uDelta.value = dt
        s.uTime.value = world.time.elapsed
        s.uEmitting.value = emitting ? 1 : 0
        s.uNozzleOffset.value = nozzleOffset
        s.uEngineGap.value = engineGap

        r.uSize.value = size
        r.uBoost.value =
            slot === 0 &&
            playerMotion.boostRemaining > 0
                ? 1
                : 0

        r.uHotCore.value.set(hotCore)
        r.uFireColor.value.set(fireColor)
        r.uSmokeColor.value.set(smokeColor)

        if (ship) {
            s.uShipPos.value.set(ship.x, ship.y)
            s.uShipVel.value.set(ship.vx, ship.vy)
            s.uShipRot.value = ship.rot
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
