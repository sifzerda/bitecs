// src/renderers/TentacleRenderer.jsx

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { useControls } from "leva"
import * as THREE from "three"
import { playerQuery, tentacleQuery } from "../ecs/constants/queries.js"
import { Position, Tentacle } from "../ecs/constants/components.js"

const PHASE = { HIDDEN: 0, EMERGING: 1, ACTIVE: 2, RETRACTING: 3 }
const MAX_TENTACLES = 16

function buildSegmentShape(baseWidth, tipWidth, length) {
    const hb = baseWidth / 2
    const ht = tipWidth / 2
    const shape = new THREE.Shape()
    shape.moveTo(0, hb)
    shape.lineTo(length, ht)
    shape.lineTo(length, -ht)
    shape.lineTo(0, -hb)
    shape.closePath()
    return shape
}

function createChain(segmentCount, originX, originY) {
    const points = []
    for (let i = 0; i <= segmentCount; i++) {
        points.push({ x: originX, y: originY, px: originX, py: originY })
    }
    return points
}

function buildReachWeights(segmentCount) {
    const weights = [0]
    for (let i = 1; i <= segmentCount; i++) {
        weights.push(i / segmentCount)
    }
    return weights
}

function integrate(points, forceX, forceY, damping, dt, reachWeights, reachActive, reachX, reachY, reachStrength) {
    for (let i = 1; i < points.length; i++) {
        const p = points[i]
        const vx = (p.x - p.px) * damping
        const vy = (p.y - p.py) * damping
        p.px = p.x
        p.py = p.y

        let fx = forceX
        let fy = forceY

        if (reachActive) {
            const dx = reachX - p.x
            const dy = reachY - p.y
            const dist = Math.hypot(dx, dy) || 0.0001
            const w = reachWeights[i]
            fx += (dx / dist) * reachStrength * w
            fy += (dy / dist) * reachStrength * w
        }

        p.x += vx + fx * dt * dt
        p.y += vy + fy * dt * dt
    }
}

function satisfyConstraints(points, segmentLength, anchorX, anchorY, iterations) {
    for (let iter = 0; iter < iterations; iter++) {
        points[0].x = anchorX
        points[0].y = anchorY

        for (let i = 0; i < points.length - 1; i++) {
            const a = points[i]
            const b = points[i + 1]
            const dx = b.x - a.x
            const dy = b.y - a.y
            const dist = Math.hypot(dx, dy) || 0.0001
            const diff = (dist - segmentLength) / dist
            const offX = dx * 0.5 * diff
            const offY = dy * 0.5 * diff

            if (i !== 0) {
                a.x += offX
                a.y += offY
            }
            b.x -= offX
            b.y -= offY
        }
    }
}

function edgeAnchor(edge, along, viewportW, viewportH) {
    const halfW = viewportW / 2
    const halfH = viewportH / 2
    switch (edge) {
        case 0: return { x: -halfW, y: along * viewportH, nx: 1, ny: 0 }
        case 1: return { x: halfW, y: along * viewportH, nx: -1, ny: 0 }
        case 2: return { x: along * viewportW, y: halfH, nx: 0, ny: -1 }
        default: return { x: along * viewportW, y: -halfH, nx: 0, ny: 1 }
    }
}

export function TentacleRenderer() {

    const cfg = useControls('Eldritch / Tentacles', {
        // ---- DEBUG controls ----
        debugForceVisible: { value: true, label: '[DEBUG] Force Visible' },
        debugAlwaysOnTop: { value: true, label: '[DEBUG] Render On Top' },
        // -------------------------
        segmentCount: { value: 10, min: 3, max: 20, step: 1 },
        segmentLength: { value: 6.0, min: 0.5, max: 12, step: 0.1 },   // DEBUG: was 3.5
        baseWidth: { value: 4.0, min: 0.1, max: 8, step: 0.1 },        // DEBUG: was 2.2
        tipWidth: { value: 0.4, min: 0.02, max: 3, step: 0.05 },       // DEBUG: was 0.15
        color: '#ff00ff',                                              // DEBUG: was dark purple, now loud
        damping: { value: 0.965, min: 0.8, max: 1, step: 0.005 },
        iterations: { value: 8, min: 1, max: 16, step: 1 },
        waveAmp: { value: 3.0, min: 0, max: 12, step: 0.1 },
        waveSpeed: { value: 1.4, min: 0, max: 6, step: 0.1 },
        reachStrength: { value: 5, min: 0, max: 30, step: 0.5 },
    }, { collapsed: false })

    const segmentGeometry = useMemo(
        () => new THREE.ExtrudeGeometry(
            buildSegmentShape(cfg.baseWidth, cfg.tipWidth, cfg.segmentLength),
            { depth: 0.2, bevelEnabled: false } // DEBUG: thicker
        ),
        [cfg.baseWidth, cfg.tipWidth, cfg.segmentLength]
    )

    const chainsRef = useRef(
        Array.from({ length: MAX_TENTACLES }, () => createChain(cfg.segmentCount, 0, 0))
    )

    const reachWeights = useMemo(() => buildReachWeights(cfg.segmentCount), [cfg.segmentCount])

    const meshRef = useRef()
    const totalSegments = MAX_TENTACLES * cfg.segmentCount

    const _matrix = useMemo(() => new THREE.Matrix4(), [])
    const _pos = useMemo(() => new THREE.Vector3(), [])
    const _quat = useMemo(() => new THREE.Quaternion(), [])
    const _scale = useMemo(() => new THREE.Vector3(1, 1, 1), [])
    const _zero = useMemo(() => new THREE.Vector3(0, 0, 0), [])
    const _euler = useMemo(() => new THREE.Euler(), [])

    // DEBUG: fixed high z so it draws over every other renderer regardless
    // of their individual z offsets. Drop back to something like 0.05 once
    // confirmed working, so it sits at the correct depth in the scene.
    const renderZ = cfg.debugAlwaysOnTop ? 5 : 0.05

    useFrame((frameState, dt) => {
        if (!meshRef.current) return

        const safeDt = Math.min(dt, 1 / 30)
        const t = frameState.clock.elapsedTime
        const viewportW = frameState.viewport.width
        const viewportH = frameState.viewport.height

        const tentacles = tentacleQuery()
        const players = playerQuery()
        const hasPlayer = players.length > 0
        const playerEid = hasPlayer ? players[0] : null

        for (let i = 0; i < MAX_TENTACLES; i++) {
            const active = i < tentacles.length
            const eid = active ? tentacles[i] : null
            const chain = chainsRef.current[i]

            // DEBUG: bypass ECS phase/deployT entirely, always show at full length.
            // This isolates "does the renderer work" from "does the state machine work."
            const deployT = cfg.debugForceVisible ? 1 : (active ? Tentacle.deployT[eid] : 0)
            const visible = cfg.debugForceVisible || deployT > 0.001

            if (visible) {
                // DEBUG: if no real tentacle entity yet (spawn hasn't run / query empty),
                // fall back to a synthetic edge slot so something still renders.
                const edge = active ? Tentacle.edge[eid] : (i % 4)
                const along = active ? Tentacle.along[eid] : ((i / MAX_TENTACLES) - 0.5) * 0.8

                const anchor = edgeAnchor(edge, along, viewportW, viewportH)
                const effSegmentLength = cfg.segmentLength * deployT

                const wavePhase = i * 1.9
                const waveX = -anchor.ny * Math.sin(t * cfg.waveSpeed + wavePhase) * cfg.waveAmp
                const waveY = anchor.nx * Math.sin(t * cfg.waveSpeed + wavePhase) * cfg.waveAmp
                const inwardX = anchor.nx * 1.5 + waveX
                const inwardY = anchor.ny * 1.5 + waveY

                const isActivePhase = active && Tentacle.phase[eid] === PHASE.ACTIVE
                const reachActive = isActivePhase && hasPlayer
                const reachX = reachActive ? Position.x[playerEid] : 0
                const reachY = reachActive ? Position.y[playerEid] : 0

                integrate(
                    chain, inwardX, inwardY, cfg.damping, safeDt,
                    reachWeights, reachActive, reachX, reachY, cfg.reachStrength
                )
                satisfyConstraints(chain, effSegmentLength, anchor.x, anchor.y, cfg.iterations)

                if (active) {
                    const tip = chain[chain.length - 1]
                    Position.x[eid] = tip.x
                    Position.y[eid] = tip.y
                }

                for (let s = 0; s < cfg.segmentCount; s++) {
                    const a = chain[s]
                    const c = chain[s + 1]
                    const angle = Math.atan2(c.y - a.y, c.x - a.x)

                    _pos.set(a.x, a.y, renderZ)
                    _euler.set(0, 0, angle)
                    _quat.setFromEuler(_euler)
                    _matrix.compose(_pos, _quat, _scale)
                    meshRef.current.setMatrixAt(i * cfg.segmentCount + s, _matrix)
                }
            } else {
                for (let s = 0; s < cfg.segmentCount; s++) {
                    _matrix.compose(_zero, _quat, _zero)
                    meshRef.current.setMatrixAt(i * cfg.segmentCount + s, _matrix)
                }
            }
        }

        meshRef.current.instanceMatrix.needsUpdate = true
        meshRef.current.count = totalSegments
    })

    return (
        <instancedMesh
            ref={meshRef}
            args={[segmentGeometry, null, totalSegments]}
            frustumCulled={false}
            renderOrder={cfg.debugAlwaysOnTop ? 999 : 0} // DEBUG: draw after everything else
        >
            <meshBasicMaterial
                color={cfg.color}
                side={THREE.DoubleSide}
                depthTest={!cfg.debugAlwaysOnTop} // DEBUG: skip depth test so nothing can occlude it
                toneMapped={false}                 // DEBUG: keeps bloom/color grading from dulling it
            />
        </instancedMesh>
    )
}