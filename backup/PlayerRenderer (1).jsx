// src/renderers/PlayerRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { playerQuery } from '../ecs/constants/queries.js'
import { Position, Rotation } from '../ecs/constants/components.js'

// ============================================================

const SHIP_CONFIG = {

    general: {
        extrudeDepth: 0.03,
    },

    fuselage: {
        color: '#cfe8ff',
        tipY: 0.78,
        shoulderY: 0.50,
        shoulderWidth: 0.18,
        waistY: -0.26,
        waistWidth: 0.14,
        tailY: -0.55,
        tailWidth: 0.30,
        notchY: -0.37,
    },

    cockpit: {
        color: '#0070ff',
        topY: 0.62,
        topWidth: 0.06,
        midY: 0.14,
        midWidth: 0.15,
        bottomY: 0.04,
        bottomWidth: 0.09,
    },

    wing: {
        color: '#cfe8ff',
        rootX: 0.20,
        rootY: 0.40,
        tipX: 0.79,
        tipY: -0.25,
        trailX: 0.76,
        trailY: -0.45,
        innerX: 0.14,
        innerY: -0.24,
    },

    wingPanel: {
        color: '#dff1ff',
        inset: 0.08,
    },

    wingtip: {
        color: '#00ff10',
        width: 0.04,
        height: 0.43,
        offsetX: 0.77,
        offsetY: -0.35,
    },

    decal: {
        enabled: true,
        color: '#00ff10',
        width: 0.06,
        length: 0.65,
        offsetX: 0.30,
        offsetY: 0.00,
        tiltDeg: -11,
    },

    cockpitGlass: {

        enabled: true,
        inset: 0.08,
        zOffset: 0.05,
        color: "#ddfdff",
        metalness: 0,
        roughness: 0.015,
        transmission: 1,
        thickness: 0.75,
        ior: 1.52,
        clearcoat: 1,
        clearcoatRoughness: 0,
        envMapIntensity: 8,
        iridescence: 10,
        iridescenceIOR: 1.35,
        iridescenceThicknessMin: 180,
        iridescenceThicknessMax: 900,
        attenuationColor: "#006eff",
        attenuationDistance: 2.2,
    },

    engineIntake: {
        enabled: true,
        color: '#00b9ff',
        width: 0.09,
        height: 0.30,
        offsetX: 0.40,
        offsetY: -0.28,
    },

    hullVent: {
        enabled: true,
        color: '#2030ff',
        count: 8,
        width: 0.09,
        height: 0.03,
        spacing: 0.05,
        offsetX: 0.21,
        offsetY: -0.08,
    },

    racingStripe: {
        enabled: true,
        color: '#00ff10',
        width: 0.04,
        length: 0.94,
        offsetX: 0.30,
        offsetY: -0.14,
        tiltDeg: -10,
    },

    noseSpike: {
        enabled: true,
        color: '#00ff10',
        length: 0.26,
        width: 0.07,
    },

    tailFin: {
        enabled: true,
        color: '#7cfff4',
        type: 'shark',
        length: 0.25,
        width: 0.35,
        sweep: 0.50,
        offsetX: 0.14,
        offsetY: -0.33,
        splayDeg: 0,
    },

}


// ============================================================
// Shape builders — base hull (unchanged, generic & config-driven)
// ============================================================

function buildFuselageShape(cfg) {
    const shape = new THREE.Shape()
    shape.moveTo(0, cfg.tipY)
    shape.lineTo(cfg.shoulderWidth, cfg.shoulderY)
    shape.lineTo(cfg.waistWidth, cfg.waistY)
    shape.lineTo(cfg.tailWidth, cfg.tailY)
    shape.lineTo(cfg.tailWidth * 0.35, cfg.notchY)
    shape.lineTo(0, cfg.tailY + 0.08)
    shape.lineTo(-cfg.tailWidth * 0.35, cfg.notchY)
    shape.lineTo(-cfg.tailWidth, cfg.tailY)
    shape.lineTo(-cfg.waistWidth, cfg.waistY)
    shape.lineTo(-cfg.shoulderWidth, cfg.shoulderY)
    shape.closePath()
    return shape
}

function buildCockpitShape(cfg) {
    const shape = new THREE.Shape()
    shape.moveTo(0, cfg.topY)
    shape.lineTo(cfg.topWidth, cfg.topY - 0.06)
    shape.lineTo(cfg.midWidth, cfg.midY)
    shape.lineTo(cfg.bottomWidth, cfg.bottomY)
    shape.lineTo(-cfg.bottomWidth, cfg.bottomY)
    shape.lineTo(-cfg.midWidth, cfg.midY)
    shape.lineTo(-cfg.topWidth, cfg.topY - 0.06)
    shape.closePath()
    return shape
}

function buildWingShape(cfg) {
    const shape = new THREE.Shape()
    shape.moveTo(cfg.rootX, cfg.rootY)
    shape.lineTo(cfg.tipX, cfg.tipY)
    shape.lineTo(cfg.trailX, cfg.trailY)
    shape.lineTo(cfg.innerX, cfg.innerY)
    shape.closePath()
    return shape
}

function buildWingPanelShape(wingCfg, inset) {
    const cx = (wingCfg.rootX + wingCfg.tipX + wingCfg.trailX + wingCfg.innerX) / 4
    const cy = (wingCfg.rootY + wingCfg.tipY + wingCfg.trailY + wingCfg.innerY) / 4

    const shrink = (x, y) => {
        const dx = x - cx
        const dy = y - cy
        const len = Math.hypot(dx, dy) || 1
        const factor = Math.max(0, 1 - inset / len)
        return [cx + dx * factor, cy + dy * factor]
    }

    const [rx, ry] = shrink(wingCfg.rootX, wingCfg.rootY)
    const [tx, ty] = shrink(wingCfg.tipX, wingCfg.tipY)
    const [trx, try_] = shrink(wingCfg.trailX, wingCfg.trailY)
    const [ix, iy] = shrink(wingCfg.innerX, wingCfg.innerY)

    const shape = new THREE.Shape()
    shape.moveTo(rx, ry)
    shape.lineTo(tx, ty)
    shape.lineTo(trx, try_)
    shape.lineTo(ix, iy)
    shape.closePath()
    return shape
}

function buildWingtipShape(cfg) {
    const halfW = cfg.width / 2
    const halfH = cfg.height / 2
    const shape = new THREE.Shape()
    shape.moveTo(-halfW, halfH)
    shape.lineTo(halfW, halfH)
    shape.lineTo(halfW, -halfH)
    shape.lineTo(-halfW, -halfH)
    shape.closePath()
    return shape
}

// Thin stripe rectangle — reused for the decal AND racing stripe.
function buildStripeShape(cfg) {
    const halfW = cfg.width / 2
    const halfL = cfg.length / 2
    const shape = new THREE.Shape()
    shape.moveTo(-halfW, halfL)
    shape.lineTo(halfW, halfL)
    shape.lineTo(halfW, -halfL)
    shape.lineTo(-halfW, -halfL)
    shape.closePath()
    return shape
}

// Engine intake scoop — trapezoid mounted on the fuselage flank.
function buildEngineIntakeShape(cfg) {
    const halfW = cfg.width / 2
    const shape = new THREE.Shape()
    shape.moveTo(-halfW, 0)
    shape.lineTo(halfW, 0)
    shape.lineTo(halfW * 0.55, -cfg.height)
    shape.lineTo(-halfW * 0.55, -cfg.height)
    shape.closePath()
    return shape
}

// Hull vent — a single thin slit. Multiple are instanced in a row.
function buildHullVentShape(cfg) {
    const halfW = cfg.width / 2
    const halfH = cfg.height / 2
    const shape = new THREE.Shape()
    shape.moveTo(-halfW, halfH)
    shape.lineTo(halfW, halfH)
    shape.lineTo(halfW, -halfH)
    shape.lineTo(-halfW, -halfH)
    shape.closePath()
    return shape
}

// Nose spike — thin triangle projecting forward past the fuselage tip.
function buildNoseSpikeShape(cfg) {
    const halfW = cfg.width / 2
    const shape = new THREE.Shape()
    shape.moveTo(0, cfg.length)
    shape.lineTo(halfW, 0)
    shape.lineTo(-halfW, 0)
    shape.closePath()
    return shape
}

// ============================================================
// Tail fin shape builders — locked to type: 'shark' in SHIP_CONFIG,
// all four kept here in case `type` is unlocked again later.
// ============================================================

function buildKiteTailShape(cfg) {
    const shape = new THREE.Shape()
    shape.moveTo(0, cfg.length / 2)
    shape.lineTo(cfg.width / 2, -cfg.length / 2 + cfg.sweep)
    shape.lineTo(0, -cfg.length / 2 - cfg.sweep)
    shape.lineTo(-cfg.width / 2, -cfg.length / 2 + cfg.sweep)
    shape.closePath()
    return shape
}

function buildDeltaTailShape(cfg) {
    const shape = new THREE.Shape()
    shape.moveTo(0, cfg.length / 2)
    shape.lineTo(cfg.width / 2, -cfg.length / 2)
    shape.lineTo(-cfg.width / 2, -cfg.length / 2)
    shape.closePath()
    return shape
}

function buildSharkTailShape(cfg) {
    const halfW = cfg.width / 2
    const halfL = cfg.length / 2
    const shape = new THREE.Shape()
    shape.moveTo(0, halfL)
    shape.lineTo(halfW * 0.35, halfL * 0.35)
    shape.lineTo(halfW, -halfL + cfg.sweep)
    shape.lineTo(halfW * 0.25, -halfL - cfg.sweep * 0.4)
    shape.lineTo(-halfW * 0.2, -halfL)
    shape.closePath()
    return shape
}

function buildBoxTailShape(cfg) {
    const halfW = cfg.width / 2
    const halfL = cfg.length / 2
    const shape = new THREE.Shape()
    shape.moveTo(-halfW, halfL)
    shape.lineTo(halfW, halfL)
    shape.lineTo(halfW, -halfL)
    shape.lineTo(-halfW, -halfL)
    shape.closePath()
    return shape
}

function buildTailFinShape(cfg) {
    switch (cfg.type) {
        case 'delta':
            return buildDeltaTailShape(cfg)
        case 'shark':
            return buildSharkTailShape(cfg)
        case 'box':
            return buildBoxTailShape(cfg)
        case 'kite':
        default:
            return buildKiteTailShape(cfg)
    }
}

// ============================================================
// Small render helpers — collapse the repeated
// "two mirrored meshes with a meshPhysicalMaterial" pattern that
// previously appeared ~7 times (wings, panels, wingtips, tail fins,
// engine intakes, hull vents, decals, racing stripes) into one place.
// ============================================================

// Custom hook: builds a static ExtrudeGeometry once from a shape-builder + config.
function useExtrudeGeometry(buildShape, cfg, extrudeSettings) {
    return useMemo(() => new THREE.ExtrudeGeometry(buildShape(cfg), extrudeSettings), []) // eslint-disable-line react-hooks/exhaustive-deps
}

// Single flat-shaded panel mesh (fuselage, cockpit base, nose spike, etc).
function Panel({ geometry, position, color, metalness = 0.2, roughness = 0.6 }) {
    return (
        <mesh geometry={geometry} position={position}>
            <meshPhysicalMaterial color={color} metalness={metalness} roughness={roughness} side={THREE.DoubleSide} />
        </mesh>
    )
}

// A pair of meshes mirrored across the ship's centerline (X axis).
// Handles every mirroring style used on the hull:
//   - rotateY:    same position, second copy spun 180° around Y (wings, wing panels)
//   - flipX:      second copy's X position negated (wingtips, engine intakes, hull vents)
//   - +flipZAngle: second copy's Z-rotation sign flipped too (decals, racing stripes)
//   - +rotateY & flipZAngle together (tail fins)
function MirroredPair({
    geometry,
    position,
    color,
    metalness = 0.2,
    roughness = 0.6,
    rotationZ = 0,
    flipX = true,
    rotateY = false,
    flipZAngle = false,
}) {
    const [x, y, z] = position
    const material = <meshPhysicalMaterial color={color} metalness={metalness} roughness={roughness} side={THREE.DoubleSide} />

    return (
        <>
            <mesh geometry={geometry} position={[x, y, z]} rotation={[0, 0, rotationZ]}>
                {material}
            </mesh>
            <mesh
                geometry={geometry}
                position={[flipX ? -x : x, y, z]}
                rotation={[0, rotateY ? Math.PI : 0, flipZAngle ? -rotationZ : rotationZ]}
            >
                {material}
            </mesh>
        </>
    )
}

// ============================================================
// Component
// ============================================================

export function PlayerRenderer() {

    const groupRef = useRef()

    const tailFin = SHIP_CONFIG.tailFin
    const engineIntake = SHIP_CONFIG.engineIntake
    const hullVent = SHIP_CONFIG.hullVent
    const racingStripe = SHIP_CONFIG.racingStripe
    const noseSpike = SHIP_CONFIG.noseSpike
    const cockpitGlass = SHIP_CONFIG.cockpitGlass

    const extrude = useMemo(() => ({ depth: SHIP_CONFIG.general.extrudeDepth, bevelEnabled: false }), [])
    const thinExtrude = useMemo(() => ({ depth: SHIP_CONFIG.general.extrudeDepth * 0.5, bevelEnabled: false }), [])

    // All geometries are fully static — built once, nothing in this
    const fuselageGeometry = useExtrudeGeometry(buildFuselageShape, SHIP_CONFIG.fuselage, extrude)
    const cockpitGeometry = useExtrudeGeometry(buildCockpitShape, SHIP_CONFIG.cockpit, extrude)
    const wingGeometry = useExtrudeGeometry(buildWingShape, SHIP_CONFIG.wing, extrude)
    const wingPanelGeometry = useMemo(
        () => new THREE.ExtrudeGeometry(buildWingPanelShape(SHIP_CONFIG.wing, SHIP_CONFIG.wingPanel.inset), extrude), [])
    const wingtipGeometry = useExtrudeGeometry(buildWingtipShape, SHIP_CONFIG.wingtip, extrude)
    const decalGeometry = useExtrudeGeometry(buildStripeShape, SHIP_CONFIG.decal, thinExtrude)
    const cockpitGlassGeometry = useMemo(() => {
        const g = cockpitGlass
        const shrunk = {
            topY: SHIP_CONFIG.cockpit.topY - g.inset,
            topWidth: Math.max(0.01, SHIP_CONFIG.cockpit.topWidth - g.inset * 0.4),
            midY: SHIP_CONFIG.cockpit.midY,
            midWidth: Math.max(0.01, SHIP_CONFIG.cockpit.midWidth - g.inset),
            bottomY: SHIP_CONFIG.cockpit.bottomY + g.inset * 0.5,
            bottomWidth: Math.max(0.01, SHIP_CONFIG.cockpit.bottomWidth - g.inset),
        }
        return new THREE.ExtrudeGeometry(buildCockpitShape(shrunk), thinExtrude)
    }, [])
    const decalTiltRad = useMemo(() => (SHIP_CONFIG.decal.tiltDeg * Math.PI) / 180, [])

    const engineIntakeGeometry = useExtrudeGeometry(buildEngineIntakeShape, engineIntake, extrude)
    const hullVentGeometry = useExtrudeGeometry(buildHullVentShape, hullVent, thinExtrude)
    const racingStripeGeometry = useExtrudeGeometry(buildStripeShape, racingStripe, thinExtrude)
    const noseSpikeGeometry = useExtrudeGeometry(buildNoseSpikeShape, noseSpike, extrude)
    const racingStripeTiltRad = useMemo(() => (racingStripe.tiltDeg * Math.PI) / 180, [])

    const ventOffsets = useMemo(() => {
        const offsets = []
        const total = (hullVent.count - 1) * hullVent.spacing
        for (let i = 0; i < hullVent.count; i++) {
            offsets.push(-total / 2 + i * hullVent.spacing)
        }
        return offsets
    }, [])

    // Tail fin geometry — locked to SHIP_CONFIG.tailFin (type: 'shark').
    const tailFinGeometry = useExtrudeGeometry(buildTailFinShape, tailFin, extrude)
    const tailFinSplayRad = useMemo(() => (tailFin.splayDeg * Math.PI) / 180, [])

    useFrame(() => {

        const group = groupRef.current
        if (!group) return

        const players = playerQuery()

        if (players.length === 0) {
            group.visible = false
            return
        }
        group.visible = true
        const pid = players[0]
        group.position.set(Position.x[pid], Position.y[pid], 0)
        group.rotation.set(0, 0, Rotation[pid])

    })

    return (
        <group ref={groupRef}>

            {/* Wings — both sides (mirrored via 180° Y rotation) */}
            <MirroredPair
                geometry={wingGeometry}
                position={[0, 0, 0]}
                color={SHIP_CONFIG.wing.color}
                flipX={false}
                rotateY
            />

            {/* Wing panels — both sides */}
            <MirroredPair
                geometry={wingPanelGeometry}
                position={[0, 0, 0.01]}
                color={SHIP_CONFIG.wingPanel.color}
                flipX={false}
                rotateY
            />

            {/* Wingtip pods — both sides */}
            <MirroredPair
                geometry={wingtipGeometry}
                position={[SHIP_CONFIG.wingtip.offsetX, SHIP_CONFIG.wingtip.offsetY, 0.02]}
                color={SHIP_CONFIG.wingtip.color}
            />

            {/* Tail fins — both sides */}
            {tailFin.enabled && (
                <MirroredPair
                    geometry={tailFinGeometry}
                    position={[tailFin.offsetX, tailFin.offsetY, 0.025]}
                    color={tailFin.color}
                    rotationZ={-tailFinSplayRad}
                    rotateY
                    flipZAngle
                />
            )}

            {/* Engine intakes — both flanks */}
            {engineIntake.enabled && (
                <MirroredPair
                    geometry={engineIntakeGeometry}
                    position={[engineIntake.offsetX, engineIntake.offsetY, 0.032]}
                    color={engineIntake.color}
                    metalness={0.5}
                    roughness={0.5}
                />
            )}

            {/* Hull vents — a row on each flank */}
            {hullVent.enabled && ventOffsets.map((dy, i) => (
                <MirroredPair
                    key={`vent-${i}`}
                    geometry={hullVentGeometry}
                    position={[hullVent.offsetX, hullVent.offsetY + dy, 0.041]}
                    color={hullVent.color}
                    metalness={0.3}
                    roughness={0.7}
                />
            ))}

            {/* Fuselage */}
            <Panel geometry={fuselageGeometry} position={[0, 0, 0.03]} color={SHIP_CONFIG.fuselage.color} roughness={0.5} />

            {/* Nose spike — projects forward from the fuselage tip */}
            {noseSpike.enabled && (
                <Panel
                    geometry={noseSpikeGeometry}
                    position={[0, SHIP_CONFIG.fuselage.tipY, 0.032]}
                    color={noseSpike.color}
                    metalness={0.6}
                    roughness={0.35}
                />
            )}

            {/* Decal stripes — both sides of fuselage */}
            {SHIP_CONFIG.decal.enabled && (
                <MirroredPair
                    geometry={decalGeometry}
                    position={[SHIP_CONFIG.decal.offsetX, SHIP_CONFIG.decal.offsetY, 0.041]}
                    color={SHIP_CONFIG.decal.color}
                    metalness={0.1}
                    roughness={0.4}
                    rotationZ={decalTiltRad}
                    flipZAngle
                />
            )}

            {/* Racing stripes — secondary decal, both sides */}
            {racingStripe.enabled && (
                <MirroredPair
                    geometry={racingStripeGeometry}
                    position={[racingStripe.offsetX, racingStripe.offsetY, 0.042]}
                    color={racingStripe.color}
                    metalness={0.1}
                    roughness={0.35}
                    rotationZ={racingStripeTiltRad}
                    flipZAngle
                />
            )}

            {/* Cockpit base */}
            <Panel geometry={cockpitGeometry} position={[0, 0, 0.05]} color={SHIP_CONFIG.cockpit.color} metalness={0.3} roughness={0.3} />

            {/* Cockpit glass — fully locked in, tuned for the scene's Environment */}
            {cockpitGlass.enabled && (
                <mesh geometry={cockpitGlassGeometry} position={[0, 0, 0.05 + cockpitGlass.zOffset]}>
                    <meshPhysicalMaterial
                        color={cockpitGlass.color}
                        metalness={cockpitGlass.metalness}
                        roughness={cockpitGlass.roughness}
                        transmission={cockpitGlass.transmission}
                        thickness={cockpitGlass.thickness}
                        ior={cockpitGlass.ior}
                        clearcoat={cockpitGlass.clearcoat}
                        clearcoatRoughness={cockpitGlass.clearcoatRoughness}
                        envMapIntensity={cockpitGlass.envMapIntensity}
                        iridescence={cockpitGlass.iridescence}
                        iridescenceIOR={cockpitGlass.iridescenceIOR}
                        iridescenceThicknessRange={[
                            cockpitGlass.iridescenceThicknessMin,
                            cockpitGlass.iridescenceThicknessMax
                        ]}
                        attenuationColor={cockpitGlass.attenuationColor}
                        attenuationDistance={cockpitGlass.attenuationDistance}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}

        </group>
    )
}
