// src/renderers/ExhaustRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { playerQuery } from '../ecs/constants/queries.js'
import { Position, Rotation, Velocity } from '../ecs/constants/components.js'
import { input } from '../ecs/systems/input.js'
import { gameState } from '../state/gameState.js'

const Z_AXIS = new THREE.Vector3(0, 0, 1)
const NORMAL_MAX_PARTICLES = 60
const BOOST_MAX_PARTICLES = 100

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
        flicker: new Float32Array(maxParticles),
        cursor: 0,
    }
}

// ============================================================

function emitParticles(pool, cfg, pid, count) {

    const rot = -Rotation[pid]
    const sin = Math.sin(rot)
    const cos = Math.cos(rot)
    const facing = Math.atan2(sin, cos)
    const px = Position.x[pid]
    const py = Position.y[pid]
    const shipVX = Velocity.x[pid]
    const shipVY = Velocity.y[pid]
    const emitX = px - sin * cfg.tailOffset
    const emitY = py - cos * cfg.tailOffset
    const speedRange = cfg.speedMax - cfg.speedMin
    const lifeRange = cfg.lifeMax - cfg.lifeMin
    const sizeRange = cfg.sizeMax - cfg.sizeMin

    for (let n = 0; n < count; n++) {

        const slot = pool.cursor

        pool.cursor++
        if (pool.cursor === pool.x.length)
            pool.cursor = 0

        const angle = facing + Math.PI + (Math.random() - 0.5) * cfg.coneAngle
        const speed = cfg.speedMin + Math.random() * speedRange

        pool.x[slot] = emitX
        pool.y[slot] = emitY
        pool.vx[slot] = Math.cos(angle) * speed + shipVX * cfg.velocityInherit
        pool.vy[slot] = Math.sin(angle) * speed + shipVY * cfg.velocityInherit

        const life = cfg.lifeMin + Math.random() * lifeRange

        pool.life[slot] = life
        pool.maxLife[slot] = life
        pool.size[slot] = cfg.sizeMin + Math.random() * sizeRange
        pool.flicker[slot] = 0.85 + Math.random() * 0.15
    }
}

// ============================================================

function advanceParticles(pool, cfg, delta) {

    const max = pool.x.length
    const drag = cfg.drag

    for (let i = 0; i < max; i++) {

        let life = pool.life[i]

        if (life <= 0) {

            pool.t[i] = 0
            pool.speed[i] = 0
            continue
        }

        life -= delta
        pool.life[i] = life

        let vx = pool.vx[i] * drag
        let vy = pool.vy[i] * drag

        pool.vx[i] = vx
        pool.vy[i] = vy

        pool.x[i] += vx * delta
        pool.y[i] += vy * delta

        pool.t[i] = life > 0 ? life / pool.maxLife[i] : 0
        pool.speed[i] = Math.sqrt(vx * vx + vy * vy)
    }
}

// ============================================================

function drawLayer(pool, mesh, layerCfg, cfg, scratch) {

    const { matrix, position, rotation, scale, scaleZero, color } = scratch

    const max = pool.x.length

    const useHSL = layerCfg.hueShift !== undefined
    const useFlicker = layerCfg.flicker

    for (let i = 0; i < max; i++) {

        const t = pool.t[i]

        if (t <= 0) {

            matrix.compose(position.set(0, 0, 0), rotation, scaleZero)

            mesh.setMatrixAt(i, matrix)
            continue
        }

        const eased = t * t
        const baseSize = pool.size[i] * eased * layerCfg.sizeScale * (useFlicker ? pool.flicker[i] : 1)
        const stretch = 1 + Math.min(pool.speed[i] * cfg.stretchFactor, cfg.stretchMax)
        const invStretch = 1 / Math.sqrt(stretch)
        position.set(pool.x[i], pool.y[i], 0)
        rotation.setFromAxisAngle(Z_AXIS, Math.atan2(pool.vy[i], pool.vx[i]))

        scale.set(baseSize * stretch, baseSize * invStretch, baseSize)
        matrix.compose(position, rotation, scale)
        mesh.setMatrixAt(i, matrix)

        if (useHSL) {

            color.setHSL(layerCfg.hueStart + layerCfg.hueShift * (1 - t), 1, layerCfg.lightnessStart + layerCfg.lightnessGain * eased)

        } else {

            color
                .set(layerCfg.color)
                .multiplyScalar(0.7 + eased * 0.3)
        }

        mesh.setColorAt(i, color)
    }

    mesh.instanceMatrix.needsUpdate = true

    if (mesh.instanceColor)
        mesh.instanceColor.needsUpdate = true
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
    core: {
        color: '#fff6d8',
        sizeScale: 0.45,
        flicker: true,
        sphereRadius: 0.32,
        opacity: 0.95,
    },
    glow: {
        hueStart: 0.11,
        hueShift: -0.09,
        lightnessStart: 0.45,
        lightnessGain: 0.35,
        sizeScale: 1.0,
        sphereRadius: 0.42,
        opacity: 0.6,
    },
}

const BOOST_DEFAULTS = {
    emitPerFrame: 3,
    lifeMin: 0.25,
    lifeMax: 0.50,
    speedMin: 1.5,
    speedMax: 3.0,
    coneAngle: 0.50,
    drag: 0.50,
    velocityInherit: 0.05,
    sizeMin: 0.12,
    sizeMax: 0.32,
    tailOffset: 0.40,
    stretchFactor: 0.09,
    stretchMax: 4.5,
    core: {
        color: '#eafcff',
        sizeScale: 0.50,
        flicker: true,
        sphereRadius: 0.36,
        opacity: 0.95,
    },
    glow: {
        hueStart: 0.58,
        hueShift: -0.10,
        lightnessStart: 0.42,
        lightnessGain: 0.45,
        sizeScale: 1.15,
        sphereRadius: 0.55,
        opacity: 0.55,
    },
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

function updateExhaust(pool, cfg, refs, delta, pid, emitting) {

    if (emitting) {
        emitParticles(pool, cfg, pid, cfg.emitPerFrame)
    }

    advanceParticles(pool, cfg, delta)

    if (refs.core.current) {
        drawLayer(pool, refs.core.current, cfg.core, cfg, _scratch)
    }

    if (refs.glow.current) {
        drawLayer(pool, refs.glow.current, cfg.glow, cfg, _scratch)
    }
}

export function ExhaustRenderer() {

    const playerId = useRef(-1)

    const normalPool = useMemo(() => createPool(NORMAL_MAX_PARTICLES), [])
    const boostPool = useMemo(() => createPool(BOOST_MAX_PARTICLES), [])

    const normalRefs = {
        core: useRef(),
        glow: useRef(),
    }

    const boostRefs = {
        core: useRef(),
        glow: useRef(),
    }

    useFrame((_, delta) => {

        if (playerId.current === -1) {

            const players = playerQuery()

            if (players.length === 0)
                return

            playerId.current = players[0]
        }

        const pid = playerId.current
        const boosting = gameState.boostActive > 0

        updateExhaust(normalPool, NORMAL_DEFAULTS, normalRefs, delta, pid, input.thrust && !boosting)
        updateExhaust(boostPool, BOOST_DEFAULTS, boostRefs, delta, pid, boosting)
    })

    return (
        <>
            <ExhaustLayer
                cfg={NORMAL_DEFAULTS}
                maxParticles={NORMAL_MAX_PARTICLES}
                meshRefs={normalRefs}
            />

            <ExhaustLayer
                cfg={BOOST_DEFAULTS}
                maxParticles={BOOST_MAX_PARTICLES}
                meshRefs={boostRefs}
            />
        </>
    )
}