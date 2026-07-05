// src/renderers/ExhaustRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { playerQuery } from '../ecs/constants/queries.js'
import { Position, Rotation, Velocity } from '../ecs/constants/components.js'
import { input } from '../ecs/systems/input.js'
import { gameState } from '../state/gameState.js'

// ============================================================
// Shared particle-pool machinery — used for both the normal
// thrust exhaust and the "special" boost exhaust look below.
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

// Advances physics for every particle in `pool` and writes the result into `mesh`.
function updateAndDrawPool(pool, mesh, cfg, delta, scratch) {
    const { matrix, position, rotation, scale, scaleZero, color } = scratch
    const max = pool.x.length

    for (let i = 0; i < max; i++) {

        if (pool.life[i] <= 0) {
            matrix.compose(position.set(0, 0, 0), rotation, scaleZero)
            mesh.setMatrixAt(i, matrix)
            continue
        }

        pool.life[i] -= delta

        pool.vx[i] *= cfg.drag
        pool.vy[i] *= cfg.drag

        pool.x[i] += pool.vx[i] * delta
        pool.y[i] += pool.vy[i] * delta

        const t = Math.max(0, pool.life[i] / pool.maxLife[i])
        const eased = t * t
        const s = pool.size[i] * eased

        position.set(pool.x[i], pool.y[i], 0)
        scale.set(s, s, s)
        matrix.compose(position, rotation, scale)
        mesh.setMatrixAt(i, matrix)

        color.setHSL(
            cfg.hueStart + cfg.hueShift * (1 - t),
            1,
            cfg.lightnessStart + cfg.lightnessGain * eased
        )
        mesh.setColorAt(i, color)
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.count = max
}

// ============================================================
// The two exhaust "looks" — normal thrust vs. boost.
// Same shape, different tuning + color, exactly as before.
// ============================================================

const NORMAL_CFG = {
    maxParticles: 60,
    emitPerFrame: 2,
    lifeMin: 0.15,
    lifeMax: 0.3,
    speedMin: 1.5,
    speedMax: 3.0,
    coneAngle: 0.35,
    drag: 0.92,
    velocityInherit: 0.05,
    sizeMin: 0.08,
    sizeMax: 0.18,
    tailOffset: 0.35,
    hueStart: 0.11,
    hueShift: -0.08,
    lightnessStart: 0.4,
    lightnessGain: 0.4,
    color: '#ffaa33',
    sphereRadius: 0.4,
}

const BOOST_CFG = {
    maxParticles: 100,
    emitPerFrame: 3,
    lifeMin: 0.25,
    lifeMax: 0.5,
    speedMin: 2.0,
    speedMax: 4.5,
    coneAngle: 0.5,
    drag: 0.90,
    velocityInherit: 0.05,
    sizeMin: 0.12,
    sizeMax: 0.28,
    tailOffset: 0.4,
    hueStart: 0.55,
    hueShift: -0.05,
    lightnessStart: 0.35,
    lightnessGain: 0.5,
    color: '#88eeff',
    sphereRadius: 0.5,
}

const _scratch = {
    matrix: new THREE.Matrix4(),
    position: new THREE.Vector3(),
    rotation: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    scaleZero: new THREE.Vector3(0, 0, 0),
    color: new THREE.Color(),
}

export function ExhaustRenderer() {

    const normalMeshRef = useRef()
    const boostMeshRef = useRef()

    const normalPool = useMemo(() => createPool(NORMAL_CFG.maxParticles), [])
    const boostPool = useMemo(() => createPool(BOOST_CFG.maxParticles), [])

    useFrame((_, delta) => {

        const players = playerQuery()
        const boosting = gameState.boostActive > 0

        // Normal exhaust only fires while thrusting and NOT boosting —
        // the boost pool takes over as the "special" look during a boost window.
        if (input.thrust && !boosting && players.length > 0) {
            emitParticles(normalPool, NORMAL_CFG, players[0], NORMAL_CFG.emitPerFrame)
        }

        if (boosting && players.length > 0) {
            emitParticles(boostPool, BOOST_CFG, players[0], BOOST_CFG.emitPerFrame)
        }

        if (normalMeshRef.current) {
            updateAndDrawPool(normalPool, normalMeshRef.current, NORMAL_CFG, delta, _scratch)
        }
        if (boostMeshRef.current) {
            updateAndDrawPool(boostPool, boostMeshRef.current, BOOST_CFG, delta, _scratch)
        }

    })

    return (
        <>
            <instancedMesh
                ref={normalMeshRef}
                args={[null, null, NORMAL_CFG.maxParticles]}
                frustumCulled={false}>
                <sphereGeometry args={[NORMAL_CFG.sphereRadius, 6, 6]} />
                <meshBasicMaterial
                    color={NORMAL_CFG.color}
                    transparent
                    opacity={0.85}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </instancedMesh>

            <instancedMesh
                ref={boostMeshRef}
                args={[null, null, BOOST_CFG.maxParticles]}
                frustumCulled={false}>
                <sphereGeometry args={[BOOST_CFG.sphereRadius, 6, 6]} />
                <meshBasicMaterial
                    color={BOOST_CFG.color}
                    transparent
                    opacity={0.85}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </instancedMesh>
        </>
    )
}