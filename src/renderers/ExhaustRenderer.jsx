// src/renderers/ExhaustRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useControls, folder } from 'leva'
import * as THREE from 'three'
import { playerQuery } from '../ecs/constants/queries.js'
import { Position, Rotation, Velocity } from '../ecs/constants/components.js'
import { input } from '../ecs/systems/input.js'
import { gameState } from '../state/gameState.js'

const Z_AXIS = new THREE.Vector3(0, 0, 1)
const NORMAL_MAX_PARTICLES = 60
const BOOST_MAX_PARTICLES = 100

// ============================================================
// ============================================================

function createPool(maxParticles) {
    return {
        x: new Float32Array(maxParticles),
        y: new Float32Array(maxParticles),
        vx: new Float32Array(maxParticles),
        vy: new Float32Array(maxParticles),
        life: new Float32Array(maxParticles),
        maxLife: new Float32Array(maxParticles),
        size: new Float32Array(maxParticles),
        t: new Float32Array(maxParticles),     
        speed: new Float32Array(maxParticles), 
        cursor: 0,
    }
}

// Spawns `count` new particles from the ship's tail into `pool`, per cfg.
function emitParticles(pool, cfg, pid, count) {
    const facingAngle = Math.atan2(Math.sin(-Rotation[pid]), Math.cos(-Rotation[pid]))

    for (let n = 0; n < count; n++) {
        const slot = pool.cursor
        pool.cursor = (pool.cursor + 1) % pool.x.length
        const angle = facingAngle + Math.PI + (Math.random() - 0.5) * cfg.coneAngle
        const speed = cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin)
        pool.x[slot] = Position.x[pid] - Math.sin(-Rotation[pid]) * cfg.tailOffset
        pool.y[slot] = Position.y[pid] - Math.cos(-Rotation[pid]) * cfg.tailOffset
        pool.vx[slot] = Math.cos(angle) * speed + Velocity.x[pid] * cfg.velocityInherit
        pool.vy[slot] = Math.sin(angle) * speed + Velocity.y[pid] * cfg.velocityInherit
        const life = cfg.lifeMin + Math.random() * (cfg.lifeMax - cfg.lifeMin)
        pool.life[slot] = life
        pool.maxLife[slot] = life
        pool.size[slot] = cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin)
    }
}
function advanceParticles(pool, cfg, delta) {
    const max = pool.x.length

    for (let i = 0; i < max; i++) {

        if (pool.life[i] <= 0) {
            pool.t[i] = 0
            continue
        }

        pool.life[i] -= delta

        pool.vx[i] *= cfg.drag
        pool.vy[i] *= cfg.drag

        pool.x[i] += pool.vx[i] * delta
        pool.y[i] += pool.vy[i] * delta

        pool.t[i] = Math.max(0, pool.life[i] / pool.maxLife[i])
        pool.speed[i] = Math.hypot(pool.vx[i], pool.vy[i])
    }
}

function drawLayer(pool, mesh, layerCfg, cfg, scratch) {
    const { matrix, position, rotation, scale, scaleZero, color } = scratch
    const max = pool.x.length

    for (let i = 0; i < max; i++) {

        const t = pool.t[i]

        if (pool.life[i] <= 0 || t <= 0) {
            matrix.compose(position.set(0, 0, 0), rotation, scaleZero)
            mesh.setMatrixAt(i, matrix)
            continue
        }

        const eased = t * t
        const flicker = layerCfg.flicker ? (0.85 + Math.random() * 0.15) : 1
        const baseSize = pool.size[i] * eased * layerCfg.sizeScale * flicker

        const stretch = 1 + Math.min(pool.speed[i] * cfg.stretchFactor, cfg.stretchMax)
        const angle = Math.atan2(pool.vy[i], pool.vx[i])

        position.set(pool.x[i], pool.y[i], 0)
        rotation.setFromAxisAngle(Z_AXIS, angle)
        scale.set(baseSize * stretch, baseSize / Math.sqrt(stretch), baseSize)
        matrix.compose(position, rotation, scale)
        mesh.setMatrixAt(i, matrix)

        if (layerCfg.hueShift !== undefined) {

            color.setHSL(layerCfg.hueStart + layerCfg.hueShift * (1 - t), 1, layerCfg.lightnessStart + layerCfg.lightnessGain * eased)
        } else {

            color.set(layerCfg.color).multiplyScalar(0.7 + 0.3 * eased)
        }
        mesh.setColorAt(i, color)
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.count = max
}

// ============================================================
// ============================================================

function useExhaustControls(panelLabel, defaults) {

    const controls = useControls(panelLabel, {
        emitPerFrame: { value: defaults.emitPerFrame, min: 0, max: 10, step: 1 },
        lifeMin: { value: defaults.lifeMin, min: 0.02, max: 1, step: 0.01 },
        lifeMax: { value: defaults.lifeMax, min: 0.02, max: 1.5, step: 0.01 },
        speedMin: { value: defaults.speedMin, min: 0, max: 10, step: 0.1 },
        speedMax: { value: defaults.speedMax, min: 0, max: 12, step: 0.1 },
        coneAngle: { value: defaults.coneAngle, min: 0, max: 2, step: 0.01 },
        drag: { value: defaults.drag, min: 0.5, max: 1, step: 0.001 },
        velocityInherit: { value: defaults.velocityInherit, min: 0, max: 1, step: 0.01 },
        sizeMin: { value: defaults.sizeMin, min: 0.01, max: 1, step: 0.01 },
        sizeMax: { value: defaults.sizeMax, min: 0.01, max: 1, step: 0.01 },
        tailOffset: { value: defaults.tailOffset, min: 0, max: 1, step: 0.01 },
        stretchFactor: { value: defaults.stretchFactor, min: 0, max: 0.3, step: 0.005 },
        stretchMax: { value: defaults.stretchMax, min: 1, max: 8, step: 0.1 },

        core: folder({
            coreColor: { value: defaults.core.color, label: 'color' },
            coreSizeScale: { value: defaults.core.sizeScale, min: 0, max: 2, step: 0.01, label: 'sizeScale' },
            coreSphereRadius: { value: defaults.core.sphereRadius, min: 0.05, max: 1, step: 0.01, label: 'sphereRadius' },
            coreOpacity: { value: defaults.core.opacity, min: 0, max: 1, step: 0.01, label: 'opacity' },
            coreFlicker: { value: defaults.core.flicker, label: 'flicker' },
        }),

        glow: folder({
            glowHueStart: { value: defaults.glow.hueStart, min: 0, max: 1, step: 0.001, label: 'hueStart' },
            glowHueShift: { value: defaults.glow.hueShift, min: -1, max: 1, step: 0.001, label: 'hueShift' },
            glowLightnessStart: { value: defaults.glow.lightnessStart, min: 0, max: 1, step: 0.01, label: 'lightnessStart' },
            glowLightnessGain: { value: defaults.glow.lightnessGain, min: 0, max: 1, step: 0.01, label: 'lightnessGain' },
            glowSizeScale: { value: defaults.glow.sizeScale, min: 0, max: 2, step: 0.01, label: 'sizeScale' },
            glowSphereRadius: { value: defaults.glow.sphereRadius, min: 0.05, max: 1.5, step: 0.01, label: 'sphereRadius' },
            glowOpacity: { value: defaults.glow.opacity, min: 0, max: 1, step: 0.01, label: 'opacity' },
        }),
    })

    return {
        ...controls,
        core: {
            color: controls.coreColor,
            sizeScale: controls.coreSizeScale,
            sphereRadius: controls.coreSphereRadius,
            opacity: controls.coreOpacity,
            flicker: controls.coreFlicker,
        },
        glow: {
            hueStart: controls.glowHueStart,
            hueShift: controls.glowHueShift,
            lightnessStart: controls.glowLightnessStart,
            lightnessGain: controls.glowLightnessGain,
            sizeScale: controls.glowSizeScale,
            sphereRadius: controls.glowSphereRadius,
            opacity: controls.glowOpacity,
        },
    }
}

const NORMAL_DEFAULTS = {
    emitPerFrame: 3,
    lifeMin: 0.25,
    lifeMax: 0.50,
    speedMin: 1.5,
    speedMax: 3.0,
    coneAngle: 0.50,
    drag: 0.50,
    velocityInherit: 0.05,
    sizeMin: 0.22,
    sizeMax: 0.32,
    tailOffset: 0.40,
    stretchFactor: 0.09,
    stretchMax: 4.5,
    core: { color: '#fff6d8', sizeScale: 0.45, flicker: true, sphereRadius: 0.32, opacity: 0.95 },
    glow: { hueStart: 0.11, hueShift: -0.09, lightnessStart: 0.45, lightnessGain: 0.35, sizeScale: 1.0, sphereRadius: 0.42, opacity: 0.6 },
}

const BOOST_DEFAULTS = {
    emitPerFrame: 3,
    lifeMin: 0.25,
    lifeMax: 0.5,
    speedMin: 1.5,
    speedMax: 3.0,
    coneAngle: 0.5,
    drag: 0.50,
    velocityInherit: 0.05,
    sizeMin: 0.12,
    sizeMax: 0.32,
    tailOffset: 0.4,
    stretchFactor: 0.09,
    stretchMax: 4.5,
    core: { color: '#eafcff', sizeScale: 0.5, flicker: true, sphereRadius: 0.36, opacity: 0.95 },
    glow: { hueStart: 0.58, hueShift: -0.10, lightnessStart: 0.42, lightnessGain: 0.45, sizeScale: 1.15, sphereRadius: 0.55, opacity: 0.55 },
}

const _scratch = {
    matrix: new THREE.Matrix4(),
    position: new THREE.Vector3(),
    rotation: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    scaleZero: new THREE.Vector3(0, 0, 0),
    color: new THREE.Color(),
}

function ExhaustLayer({ cfg, maxParticles, meshRefs }) {
    return (
        <>
            <instancedMesh
                ref={meshRefs.core}
                args={[null, null, maxParticles]}
                frustumCulled={false}>
                <sphereGeometry args={[cfg.core.sphereRadius, 6, 6]} />
                <meshBasicMaterial
                    color="white"
                    transparent
                    opacity={cfg.core.opacity}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </instancedMesh>

            <instancedMesh
                ref={meshRefs.glow}
                args={[null, null, maxParticles]}
                frustumCulled={false}>
                <sphereGeometry args={[cfg.glow.sphereRadius, 6, 6]} />
                <meshBasicMaterial
                    color="white"
                    transparent
                    opacity={cfg.glow.opacity}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </instancedMesh>
        </>
    )
}

export function ExhaustRenderer() {

    const normalCfg = useExhaustControls('Exhaust · Normal', NORMAL_DEFAULTS)
    const boostCfg = useExhaustControls('Exhaust · Boost', BOOST_DEFAULTS)

    const normalCoreRef = useRef()
    const normalGlowRef = useRef()
    const boostCoreRef = useRef()
    const boostGlowRef = useRef()

    const normalPool = useMemo(() => createPool(NORMAL_MAX_PARTICLES), [])
    const boostPool = useMemo(() => createPool(BOOST_MAX_PARTICLES), [])

    useFrame((_, delta) => {

        const players = playerQuery()
        const boosting = gameState.boostActive > 0

        if (input.thrust && !boosting && players.length > 0) {
            emitParticles(normalPool, normalCfg, players[0], normalCfg.emitPerFrame)
        }

        if (boosting && players.length > 0) {
            emitParticles(boostPool, boostCfg, players[0], boostCfg.emitPerFrame)
        }

        advanceParticles(normalPool, normalCfg, delta)
        advanceParticles(boostPool, boostCfg, delta)

        if (normalCoreRef.current) drawLayer(normalPool, normalCoreRef.current, normalCfg.core, normalCfg, _scratch)
        if (normalGlowRef.current) drawLayer(normalPool, normalGlowRef.current, normalCfg.glow, normalCfg, _scratch)
        if (boostCoreRef.current) drawLayer(boostPool, boostCoreRef.current, boostCfg.core, boostCfg, _scratch)
        if (boostGlowRef.current) drawLayer(boostPool, boostGlowRef.current, boostCfg.glow, boostCfg, _scratch)

    })

    return (
        <>
            <ExhaustLayer
                cfg={normalCfg}
                maxParticles={NORMAL_MAX_PARTICLES}
                meshRefs={{ core: normalCoreRef, glow: normalGlowRef }}
            />
            <ExhaustLayer
                cfg={boostCfg}
                maxParticles={BOOST_MAX_PARTICLES}
                meshRefs={{ core: boostCoreRef, glow: boostGlowRef }}
            />
        </>
    )
}
