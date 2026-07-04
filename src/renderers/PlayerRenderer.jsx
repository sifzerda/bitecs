
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useControls } from 'leva'
import * as THREE from 'three'
import { playerQuery } from '../ecs/constants/queries.js'
import { Position, Rotation } from '../ecs/constants/components.js'

// ============================================================
// ============================================================

const SHIP_CONFIG = {
    fuselage: {
        color: '#e030d8',
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
        color: '#a8c93c',
        topY: 0.62,
        topWidth: 0.06,
        midY: 0.14,
        midWidth: 0.15,
        bottomY: 0.04,
        bottomWidth: 0.09,
    },

    wing: {
        color: '#e8362c',
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
        color: '#f4d93c',
        inset: 0.08,
    },

    wingtip: {
        color: '#e030d8',
        width: 0.04,
        height: 0.43,
        offsetX: 0.77,
        offsetY: -0.35,
    },

    // Locked in — was Ship.Decal
    decal: {
        enabled: true,
        color: '#e8362c',
        width: 0.06,
        length: 0.65,
        offsetX: 0.30,
        offsetY: 0.00,
        tiltDeg: -11,
    },

    // Locked in — was Ship.CockpitGlass
    cockpitGlass: {
        enabled: true,
        color: '#cfe8ff',
        metalness: 1,
        roughness: 0.20,
        clearcoat: 1,
        clearcoatRoughness: 0.24,
        inset: 0.08,
        zOffset: 0.05,
    },

    // Locked in — was Ship.EngineIntake
    engineIntake: {
        enabled: true,
        color: '#0019ff',
        width: 0.09,
        height: 0.30,
        offsetX: 0.40,
        offsetY: -0.28,
    },

    // Locked in — was Ship.HullVent
    hullVent: {
        enabled: true,
        color: '#2000ff',
        count: 8,
        width: 0.09,
        height: 0.03,
        spacing: 0.05,
        offsetX: 0.21,
        offsetY: -0.08,
    },

    // Locked in — was Ship.RacingStripe
    racingStripe: {
        enabled: true,
        color: '#ff0000',
        width: 0.04,
        length: 0.94,
        offsetX: 0.30,
        offsetY: -0.14,
        tiltDeg: -10,
    },

    // Locked in — was Ship.NoseSpike
    noseSpike: {
        enabled: true,
        color: '#00ff10',
        length: 0.26,
        width: 0.07,
    },
    general: {
        extrudeDepth: 0.03,
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

// Thin stripe rectangle — reused for the locked decal AND the
// locked racing stripe (same shape, different instance/config).
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

// ============================================================
// NEW shape builders
// ============================================================

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
// Tail fin shape builders — selectable via Ship.TailFin `type`
// ============================================================

// "kite" — swept kite-style tail fin (the original locked-in shape).
function buildKiteTailShape(cfg) {
    const shape = new THREE.Shape()
    shape.moveTo(0, cfg.length / 2)
    shape.lineTo(cfg.width / 2, -cfg.length / 2 + cfg.sweep)
    shape.lineTo(0, -cfg.length / 2 - cfg.sweep)
    shape.lineTo(-cfg.width / 2, -cfg.length / 2 + cfg.sweep)
    shape.closePath()
    return shape
}

// "delta" — simple straight-edged triangle fin.
function buildDeltaTailShape(cfg) {
    const shape = new THREE.Shape()
    shape.moveTo(0, cfg.length / 2)
    shape.lineTo(cfg.width / 2, -cfg.length / 2)
    shape.lineTo(-cfg.width / 2, -cfg.length / 2)
    shape.closePath()
    return shape
}

// "shark" — asymmetric swept fin, like a dorsal fin leaning back.
// Mirroring left/right (via rotation.y = PI) flips the lean naturally.
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

// "box" — flat rectangular tail fin, no sweep.
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
// Component
// ============================================================

export function PlayerRenderer() {

    const groupRef = useRef()

    // -------------------------
    // The ONLY leva control now: TailFin (type + shared params).
    // EngineIntake / HullVent / RacingStripe / NoseSpike are locked
    // into SHIP_CONFIG. Decal / CockpitGlass remain locked too.
    // -------------------------

    const tailFin = useControls('Ship.TailFin', {
        enabled: true,
        type: { value: 'shark', options: ['kite', 'delta', 'shark', 'box'] },
        color: '#33ff00',
        length: { value: 0.25, min: 0.1, max: 1.2, step: 0.01 },
        width: { value: 0.35, min: 0.05, max: 1.0, step: 0.01 },
        sweep: { value: 0.50, min: 0, max: 0.5, step: 0.01 },
        offsetX: { value: 0.14, min: 0, max: 0.5, step: 0.005 },
        offsetY: { value: -0.33, min: -0.5, max: 0.5, step: 0.01 },
        splayDeg: { value: 0, min: -45, max: 45, step: 1 },
    })

    // Locked-in configs, aliased so the JSX below stays unchanged.
    const engineIntake = SHIP_CONFIG.engineIntake
    const hullVent = SHIP_CONFIG.hullVent
    const racingStripe = SHIP_CONFIG.racingStripe
    const noseSpike = SHIP_CONFIG.noseSpike

    const extrude = useMemo(() => ({ depth: SHIP_CONFIG.general.extrudeDepth, bevelEnabled: false }), [])
    const thinExtrude = useMemo(() => ({ depth: SHIP_CONFIG.general.extrudeDepth * 0.5, bevelEnabled: false }), [])

    // Base hull geometries — built once, config is static.
    const fuselageGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildFuselageShape(SHIP_CONFIG.fuselage), extrude), [extrude])
    const cockpitGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildCockpitShape(SHIP_CONFIG.cockpit), extrude), [extrude])
    const wingGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildWingShape(SHIP_CONFIG.wing), extrude),
        [extrude]
    )
    const wingPanelGeometry = useMemo(() => new THREE.ExtrudeGeometry(
        buildWingPanelShape(SHIP_CONFIG.wing, SHIP_CONFIG.wingPanel.inset),
        extrude
    ),
        [extrude]
    )
    const wingtipGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildWingtipShape(SHIP_CONFIG.wingtip), extrude),
        [extrude]
    )
    const decalGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildStripeShape(SHIP_CONFIG.decal), thinExtrude),
        [thinExtrude]
    )
    const cockpitGlassGeometry = useMemo(() => {
        const g = SHIP_CONFIG.cockpitGlass
        const shrunk = {
            topY: SHIP_CONFIG.cockpit.topY - g.inset,
            topWidth: Math.max(0.01, SHIP_CONFIG.cockpit.topWidth - g.inset * 0.4),
            midY: SHIP_CONFIG.cockpit.midY,
            midWidth: Math.max(0.01, SHIP_CONFIG.cockpit.midWidth - g.inset),
            bottomY: SHIP_CONFIG.cockpit.bottomY + g.inset * 0.5,
            bottomWidth: Math.max(0.01, SHIP_CONFIG.cockpit.bottomWidth - g.inset),
        }
        return new THREE.ExtrudeGeometry(buildCockpitShape(shrunk), thinExtrude)
    }, [thinExtrude])
    const decalTiltRad = useMemo(() => (SHIP_CONFIG.decal.tiltDeg * Math.PI) / 180,
        []
    )

    // Locked-part geometries — static, built once from SHIP_CONFIG.
    const engineIntakeGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildEngineIntakeShape(engineIntake), extrude),
        [extrude]
    )
    const hullVentGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildHullVentShape(hullVent), thinExtrude),
        [thinExtrude]
    )
    const racingStripeGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildStripeShape(racingStripe), thinExtrude),
        [thinExtrude]
    )
    const noseSpikeGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildNoseSpikeShape(noseSpike), extrude),
        [extrude]
    )
    const racingStripeTiltRad = useMemo(() => (racingStripe.tiltDeg * Math.PI) / 180,
        []
    )

    // Vent row offsets — static now, but kept memoized in case
    // hullVent config is ever made live again.
    const ventOffsets = useMemo(() => {
        const offsets = []
        const total = (hullVent.count - 1) * hullVent.spacing
        for (let i = 0; i < hullVent.count; i++) {
            offsets.push(-total / 2 + i * hullVent.spacing)
        }
        return offsets
    }, [])

    // Tail fin geometry — live, reacts to type + shared params.
    const tailFinGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildTailFinShape(tailFin), extrude),
        [tailFin, extrude]
    )
    const tailFinSplayRad = useMemo(() => (tailFin.splayDeg * Math.PI) / 180,
        [tailFin.splayDeg]
    )

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

            {/* Wings — both sides */}
            <mesh geometry={wingGeometry} position={[0, 0, 0]}>
                <meshStandardMaterial color={SHIP_CONFIG.wing.color} metalness={0.2} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>
            <mesh geometry={wingGeometry} position={[0, 0, 0]} rotation={[0, Math.PI, 0]}>
                <meshStandardMaterial color={SHIP_CONFIG.wing.color} metalness={0.2} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>

            {/* Wing panels — both sides */}
            <mesh geometry={wingPanelGeometry} position={[0, 0, 0.01]}>
                <meshStandardMaterial color={SHIP_CONFIG.wingPanel.color} metalness={0.2} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>
            <mesh geometry={wingPanelGeometry} position={[0, 0, 0.01]} rotation={[0, Math.PI, 0]}>
                <meshStandardMaterial color={SHIP_CONFIG.wingPanel.color} metalness={0.2} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>

            {/* Wingtip pods — both sides */}
            <mesh geometry={wingtipGeometry} position={[SHIP_CONFIG.wingtip.offsetX, SHIP_CONFIG.wingtip.offsetY, 0.02]}>
                <meshStandardMaterial color={SHIP_CONFIG.wingtip.color} metalness={0.2} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>
            <mesh geometry={wingtipGeometry} position={[-SHIP_CONFIG.wingtip.offsetX, SHIP_CONFIG.wingtip.offsetY, 0.02]}>
                <meshStandardMaterial color={SHIP_CONFIG.wingtip.color} metalness={0.2} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>

            {/* Tail fins — both sides, LIVE via Ship.TailFin menu */}
            {tailFin.enabled && (
                <>
                    <mesh
                        geometry={tailFinGeometry}
                        position={[tailFin.offsetX, tailFin.offsetY, 0.025]}
                        rotation={[0, 0, -tailFinSplayRad]}
                    >
                        <meshStandardMaterial color={tailFin.color} metalness={0.2} roughness={0.6} side={THREE.DoubleSide} />
                    </mesh>
                    <mesh
                        geometry={tailFinGeometry}
                        position={[-tailFin.offsetX, tailFin.offsetY, 0.025]}
                        rotation={[0, Math.PI, tailFinSplayRad]}
                    >
                        <meshStandardMaterial color={tailFin.color} metalness={0.2} roughness={0.6} side={THREE.DoubleSide} />
                    </mesh>
                </>
            )}

            {/* Engine intakes — both flanks */}
            {engineIntake.enabled && (
                <>
                    <mesh geometry={engineIntakeGeometry} position={[engineIntake.offsetX, engineIntake.offsetY, 0.032]}>
                        <meshStandardMaterial color={engineIntake.color} metalness={0.5} roughness={0.5} side={THREE.DoubleSide} />
                    </mesh>
                    <mesh geometry={engineIntakeGeometry} position={[-engineIntake.offsetX, engineIntake.offsetY, 0.032]}>
                        <meshStandardMaterial color={engineIntake.color} metalness={0.5} roughness={0.5} side={THREE.DoubleSide} />
                    </mesh>
                </>
            )}

            {/* Hull vents — a row on each flank */}
            {hullVent.enabled && ventOffsets.map((dy, i) => (
                <group key={`vent-${i}`}>
                    <mesh
                        geometry={hullVentGeometry}
                        position={[hullVent.offsetX, hullVent.offsetY + dy, 0.041]}
                    >
                        <meshStandardMaterial color={hullVent.color} metalness={0.3} roughness={0.7} side={THREE.DoubleSide} />
                    </mesh>
                    <mesh
                        geometry={hullVentGeometry}
                        position={[-hullVent.offsetX, hullVent.offsetY + dy, 0.041]}
                    >
                        <meshStandardMaterial color={hullVent.color} metalness={0.3} roughness={0.7} side={THREE.DoubleSide} />
                    </mesh>
                </group>
            ))}

            {/* Fuselage */}
            <mesh geometry={fuselageGeometry} position={[0, 0, 0.03]}>
                <meshStandardMaterial color={SHIP_CONFIG.fuselage.color} metalness={0.2} roughness={0.5} side={THREE.DoubleSide} />
            </mesh>

            {/* Nose spike — projects forward from the fuselage tip */}
            {noseSpike.enabled && (
                <mesh geometry={noseSpikeGeometry} position={[0, SHIP_CONFIG.fuselage.tipY, 0.032]}>
                    <meshStandardMaterial color={noseSpike.color} metalness={0.6} roughness={0.35} side={THREE.DoubleSide} />
                </mesh>
            )}

            {/* Decal stripes — both sides of fuselage, locked in */}
            {SHIP_CONFIG.decal.enabled && (
                <>
                    <mesh
                        geometry={decalGeometry}
                        position={[SHIP_CONFIG.decal.offsetX, SHIP_CONFIG.decal.offsetY, 0.041]}
                        rotation={[0, 0, decalTiltRad]}
                    >
                        <meshStandardMaterial color={SHIP_CONFIG.decal.color} metalness={0.1} roughness={0.4} side={THREE.DoubleSide} />
                    </mesh>
                    <mesh
                        geometry={decalGeometry}
                        position={[-SHIP_CONFIG.decal.offsetX, SHIP_CONFIG.decal.offsetY, 0.041]}
                        rotation={[0, 0, -decalTiltRad]}
                    >
                        <meshStandardMaterial color={SHIP_CONFIG.decal.color} metalness={0.1} roughness={0.4} side={THREE.DoubleSide} />
                    </mesh>
                </>
            )}

            {/* Racing stripes — secondary decal, both sides, locked in */}
            {racingStripe.enabled && (
                <>
                    <mesh
                        geometry={racingStripeGeometry}
                        position={[racingStripe.offsetX, racingStripe.offsetY, 0.042]}
                        rotation={[0, 0, racingStripeTiltRad]}
                    >
                        <meshStandardMaterial color={racingStripe.color} metalness={0.1} roughness={0.35} side={THREE.DoubleSide} />
                    </mesh>
                    <mesh
                        geometry={racingStripeGeometry}
                        position={[-racingStripe.offsetX, racingStripe.offsetY, 0.042]}
                        rotation={[0, 0, -racingStripeTiltRad]}
                    >
                        <meshStandardMaterial color={racingStripe.color} metalness={0.1} roughness={0.35} side={THREE.DoubleSide} />
                    </mesh>
                </>
            )}

            {/* Cockpit base */}
            <mesh geometry={cockpitGeometry} position={[0, 0, 0.05]}>
                <meshStandardMaterial color={SHIP_CONFIG.cockpit.color} metalness={0.3} roughness={0.3} side={THREE.DoubleSide} />
            </mesh>

            {/* Cockpit glass — locked in */}
            {SHIP_CONFIG.cockpitGlass.enabled && (
                <mesh geometry={cockpitGlassGeometry} position={[0, 0, 0.05 + SHIP_CONFIG.cockpitGlass.zOffset]}>
                    <meshPhysicalMaterial
                        color={SHIP_CONFIG.cockpitGlass.color}
                        metalness={SHIP_CONFIG.cockpitGlass.metalness}
                        roughness={SHIP_CONFIG.cockpitGlass.roughness}
                        clearcoat={SHIP_CONFIG.cockpitGlass.clearcoat}
                        clearcoatRoughness={SHIP_CONFIG.cockpitGlass.clearcoatRoughness}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}

        </group>
    )
}