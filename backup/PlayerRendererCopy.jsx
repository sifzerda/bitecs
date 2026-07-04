
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useControls, folder } from 'leva'
import * as THREE from 'three'
import { playerQuery } from '../ecs/constants/queries.js'
import { Position, Rotation } from '../ecs/constants/components.js'

// ============================================================
// Shape builders — unchanged, still generic & config-driven
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

// ============================================================
// Component
// ============================================================

export function PlayerRenderer() {

    const groupRef = useRef()

    // -------------------------
    // Leva controls — grouped into folders matching each ship piece.
    // Every value here maps 1:1 to what SHIP_CONFIG used to hardcode.
    // -------------------------

    const fuselage = useControls('Ship.Fuselage', {
        color: '#e030d8',
        tipY: { value: 1.0, min: 0.3, max: 1.5, step: 0.01 },
        shoulderY: { value: 0.5, min: -0.5, max: 1, step: 0.01 },
        shoulderWidth: { value: 0.22, min: 0.05, max: 0.6, step: 0.005 },
        waistY: { value: 0.05, min: -0.5, max: 0.5, step: 0.01 },
        waistWidth: { value: 0.14, min: 0.02, max: 0.4, step: 0.005 },
        tailY: { value: -0.55, min: -1.2, max: 0, step: 0.01 },
        tailWidth: { value: 0.24, min: 0.05, max: 0.6, step: 0.005 },
        notchY: { value: -0.4, min: -1.0, max: 0, step: 0.01 },
    })

    const cockpit = useControls('Ship.Cockpit', {
        color: '#a8c93c',
        topY: { value: 0.62, min: 0, max: 1.2, step: 0.01 },
        topWidth: { value: 0.1, min: 0.02, max: 0.4, step: 0.005 },
        midY: { value: 0.35, min: -0.5, max: 1, step: 0.01 },
        midWidth: { value: 0.15, min: 0.02, max: 0.4, step: 0.005 },
        bottomY: { value: 0.08, min: -0.5, max: 0.8, step: 0.01 },
        bottomWidth: { value: 0.08, min: 0.02, max: 0.4, step: 0.005 },
    })

    const wing = useControls('Ship.Wing', {
        color: '#e8362c',
        rootX: { value: 0.15, min: 0, max: 0.5, step: 0.005 },
        rootY: { value: 0.35, min: -0.5, max: 1, step: 0.01 },
        tipX: { value: 1.0, min: 0.3, max: 2.0, step: 0.01 },
        tipY: { value: -0.05, min: -1, max: 0.5, step: 0.01 },
        trailX: { value: 0.55, min: 0.1, max: 1.5, step: 0.01 },
        trailY: { value: -0.35, min: -1, max: 0.5, step: 0.01 },
        innerX: { value: 0.16, min: 0, max: 0.5, step: 0.005 },
        innerY: { value: -0.1, min: -0.8, max: 0.5, step: 0.01 },
    })

    const wingPanel = useControls('Ship.WingPanel', {
        color: '#f4d93c',
        inset: { value: 0.14, min: 0, max: 0.6, step: 0.005 },
    })

    const wingtip = useControls('Ship.Wingtip', {
        color: '#e030d8',
        width: { value: 0.06, min: 0.01, max: 0.3, step: 0.005 },
        height: { value: 0.34, min: 0.05, max: 0.8, step: 0.005 },
        offsetX: { value: 1.02, min: 0.3, max: 2.0, step: 0.01 },
        offsetY: { value: -0.05, min: -1, max: 0.5, step: 0.01 },
    })

    const { extrudeDepth } = useControls('Ship.General', {
        extrudeDepth: { value: 0.03, min: 0.005, max: 0.15, step: 0.005 },
    })

    const extrude = useMemo(() => ({ depth: extrudeDepth, bevelEnabled: false }), [extrudeDepth])

    // Geometries rebuild whenever their relevant control values change —
    // dependency arrays list every field that shape actually reads.
    const fuselageGeometry = useMemo(
        () => new THREE.ExtrudeGeometry(buildFuselageShape(fuselage), extrude),
        [fuselage, extrude]
    )
    const cockpitGeometry = useMemo(
        () => new THREE.ExtrudeGeometry(buildCockpitShape(cockpit), extrude),
        [cockpit, extrude]
    )
    const wingGeometry = useMemo(
        () => new THREE.ExtrudeGeometry(buildWingShape(wing), extrude),
        [wing, extrude]
    )
    const wingPanelGeometry = useMemo(
        () => new THREE.ExtrudeGeometry(buildWingPanelShape(wing, wingPanel.inset), extrude),
        [wing, wingPanel.inset, extrude]
    )
    const wingtipGeometry = useMemo(
        () => new THREE.ExtrudeGeometry(buildWingtipShape(wingtip), extrude),
        [wingtip, extrude]
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
                <meshStandardMaterial color={wing.color} metalness={0.2} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>
            <mesh geometry={wingGeometry} position={[0, 0, 0]} rotation={[0, Math.PI, 0]}>
                <meshStandardMaterial color={wing.color} metalness={0.2} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>

            {/* Wing panels — both sides */}
            <mesh geometry={wingPanelGeometry} position={[0, 0, 0.01]}>
                <meshStandardMaterial color={wingPanel.color} metalness={0.2} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>
            <mesh geometry={wingPanelGeometry} position={[0, 0, 0.01]} rotation={[0, Math.PI, 0]}>
                <meshStandardMaterial color={wingPanel.color} metalness={0.2} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>

            {/* Wingtip pods — both sides */}
            <mesh geometry={wingtipGeometry} position={[wingtip.offsetX, wingtip.offsetY, 0.02]}>
                <meshStandardMaterial color={wingtip.color} metalness={0.2} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>
            <mesh geometry={wingtipGeometry} position={[-wingtip.offsetX, wingtip.offsetY, 0.02]}>
                <meshStandardMaterial color={wingtip.color} metalness={0.2} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>

            {/* Fuselage */}
            <mesh geometry={fuselageGeometry} position={[0, 0, 0.03]}>
                <meshStandardMaterial color={fuselage.color} metalness={0.2} roughness={0.5} side={THREE.DoubleSide} />
            </mesh>

            {/* Cockpit */}
            <mesh geometry={cockpitGeometry} position={[0, 0, 0.05]}>
                <meshStandardMaterial color={cockpit.color} metalness={0.3} roughness={0.3} side={THREE.DoubleSide} />
            </mesh>

        </group>
    )
}
