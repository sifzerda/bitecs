// src/renderers/DroneRenderer.jsx
//
// Top-down quad-legged drone: rounded elliptical body, four segmented
// ("elbowed") legs radiating outward, each terminating in a flat spinning
// propeller. Built with the same ExtrudeGeometry shape-builder + Leva
// pattern used in BossRenderer.jsx.

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { useControls } from "leva"
import * as THREE from "three"

// ============================================================
// Shape builders
// ============================================================

function buildBodyShape(cfg) {
    const shape = new THREE.Shape()
    shape.absellipse(0, 0, cfg.radiusX, cfg.radiusY, 0, Math.PI * 2, false, 0)
    return shape
}

// Tapered strip running along +X from the pivot (x=0) out to x=length.
// Used for both the upper (hip -> elbow) and lower (elbow -> prop) leg segments.
function buildLegSegmentShape(cfg) {
    const halfBase = cfg.baseWidth / 2
    const halfTip = cfg.tipWidth / 2
    const shape = new THREE.Shape()
    shape.moveTo(0, halfBase)
    shape.lineTo(cfg.length, halfTip)
    shape.lineTo(cfg.length, -halfTip)
    shape.lineTo(0, -halfBase)
    shape.closePath()
    return shape
}

function buildJointShape(cfg) {
    const shape = new THREE.Shape()
    shape.absarc(0, 0, cfg.radius, 0, Math.PI * 2, false)
    return shape
}

function buildPropBladeShape(cfg) {
    const r0 = cfg.hubRadius
    const len = cfg.bladeLength
    const halfW = cfg.bladeWidth / 2
    const shape = new THREE.Shape()
    shape.moveTo(-halfW * 0.4, r0)
    shape.quadraticCurveTo(-halfW, r0 + len * 0.35, -halfW * 0.55, r0 + len * 0.85)
    shape.quadraticCurveTo(-halfW * 0.2, r0 + len, 0, r0 + len)
    shape.quadraticCurveTo(halfW * 0.2, r0 + len, halfW * 0.55, r0 + len * 0.85)
    shape.quadraticCurveTo(halfW, r0 + len * 0.35, halfW * 0.4, r0)
    shape.closePath()
    return shape
}

function buildPropHubShape(cfg) {
    const shape = new THREE.Shape()
    shape.absarc(0, 0, cfg.hubRadius, 0, Math.PI * 2, false)
    return shape
}

// ============================================================
// Propeller — flat, top-down: spins around its own Z axis only
// (unlike BossRenderer's edge-on prop, this one faces the camera
// directly since we're looking straight down at the drone).
// ============================================================

function Propeller({ hubGeometry, bladeGeometry, cfg, position }) {
    const spinRef = useRef()

    useFrame((_, delta) => {
        if (spinRef.current) {
            spinRef.current.rotation.z += cfg.spinSpeed * delta
        }
    })

    const bladeAngles = useMemo(
        () => Array.from({ length: cfg.bladeCount }, (_, i) => (Math.PI * 2 * i) / cfg.bladeCount),
        [cfg.bladeCount]
    )

    return (
        <group position={position} ref={spinRef}>
            <mesh geometry={hubGeometry}>
                <meshPhysicalMaterial color={cfg.hubColor} metalness={0.6} roughness={0.3} side={THREE.DoubleSide} />
            </mesh>
            {bladeAngles.map((angle, i) => (
                <mesh key={i} geometry={bladeGeometry} rotation={[0, 0, angle]}>
                    <meshPhysicalMaterial
                        color={cfg.bladeColor}
                        metalness={0.3}
                        roughness={0.5}
                        side={THREE.DoubleSide}
                        transparent
                        opacity={cfg.bladeOpacity}
                    />
                </mesh>
            ))}
        </group>
    )
}

// ============================================================
// Leg — upper segment fixed to the body at `baseAngle`, then a nested
// group pivoted at the elbow (rotated by `elbowRad`) carrying the lower
// segment and the propeller at its tip. The nested pivot is what gives
// the leg its "elbowed" bend.
// ============================================================

function Leg({ geo, cfg, baseAngle }) {
    return (
        <group rotation={[0, 0, baseAngle]}>
            {/* Upper segment: body edge -> elbow */}
            <mesh geometry={geo.upperSegment} position={[cfg.bodyRadius, 0, 0.02]}>
                <meshPhysicalMaterial color={cfg.legColor} metalness={0.45} roughness={0.5} side={THREE.DoubleSide} />
            </mesh>

            {/* Elbow pivot: everything below rotates around this point */}
            <group position={[cfg.bodyRadius + cfg.upperLength, 0, 0]} rotation={[0, 0, cfg.elbowRad]}>
                <mesh geometry={geo.joint} position={[0, 0, 0.025]}>
                    <meshPhysicalMaterial color={cfg.jointColor} metalness={0.55} roughness={0.4} side={THREE.DoubleSide} />
                </mesh>

                {/* Lower segment: elbow -> propeller mount */}
                <mesh geometry={geo.lowerSegment} position={[0, 0, 0.02]}>
                    <meshPhysicalMaterial color={cfg.legColor} metalness={0.45} roughness={0.5} side={THREE.DoubleSide} />
                </mesh>

                <Propeller
                    hubGeometry={geo.propHub}
                    bladeGeometry={geo.propBlade}
                    cfg={cfg.propeller}
                    position={[cfg.lowerLength, 0, 0.03]}
                />
            </group>
        </group>
    )
}

// ============================================================

export function DroneRenderer({ position = [0, 0, 0], rotation = 0 }) {

    const general = useControls("Drone / General", {
        extrudeDepth: { value: 0.03, min: 0.005, max: 0.1, step: 0.005 },
    }, { collapsed: true })

    const body = useControls("Drone / Body", {
        color: "#e8e8e8",
        radiusX: { value: 0.42, min: 0.1, max: 1, step: 0.01 },
        radiusY: { value: 0.34, min: 0.1, max: 1, step: 0.01 },
        domeColor: "#2a2a2a",
        domeRadius: { value: 0.14, min: 0, max: 0.4, step: 0.01 },
    }, { collapsed: true })

    const leg = useControls("Drone / Leg", {
        color: "#3a3a3a",
        jointColor: "#111111",
        bodyRadius: { value: 0.30, min: 0, max: 0.6, step: 0.01 },
        upperLength: { value: 0.38, min: 0.1, max: 1, step: 0.01 },
        lowerLength: { value: 0.34, min: 0.1, max: 1, step: 0.01 },
        baseWidth: { value: 0.10, min: 0.02, max: 0.3, step: 0.005 },
        midWidth: { value: 0.06, min: 0.01, max: 0.2, step: 0.005 },
        tipWidth: { value: 0.045, min: 0.01, max: 0.15, step: 0.005 },
        jointRadius: { value: 0.055, min: 0.01, max: 0.15, step: 0.005 },
        elbowDeg: { value: 28, min: -80, max: 80, step: 1 },
        spreadDeg: { value: 90, min: 20, max: 180, step: 1 },
        startAngleDeg: { value: 45, min: 0, max: 360, step: 1 },
    }, { collapsed: true })

    const propeller = useControls("Drone / Propeller", {
        bladeColor: "#1a1a1a",
        hubColor: "#000000",
        bladeCount: { value: 2, min: 2, max: 6, step: 1 },
        bladeLength: { value: 0.20, min: 0.02, max: 0.5, step: 0.01 },
        bladeWidth: { value: 0.07, min: 0.01, max: 0.2, step: 0.005 },
        hubRadius: { value: 0.035, min: 0.005, max: 0.15, step: 0.005 },
        spinSpeed: { value: 22, min: -40, max: 40, step: 0.5 },
        bladeOpacity: { value: 0.75, min: 0.1, max: 1, step: 0.05 },
    }, { collapsed: true })

    const extrude = useMemo(() => ({ depth: general.extrudeDepth, bevelEnabled: false }), [general.extrudeDepth])
    const thinExtrude = useMemo(() => ({ depth: general.extrudeDepth * 0.6, bevelEnabled: false }), [general.extrudeDepth])

    // ---- geometries ----

    const bodyGeometry = useMemo(
        () => new THREE.ExtrudeGeometry(buildBodyShape(body), extrude),
        [body.radiusX, body.radiusY, extrude]
    )

    const domeGeometry = useMemo(
        () => new THREE.ExtrudeGeometry(buildJointShape({ radius: body.domeRadius }), thinExtrude),
        [body.domeRadius, thinExtrude]
    )

    const upperSegmentGeometry = useMemo(
        () => new THREE.ExtrudeGeometry(
            buildLegSegmentShape({ length: leg.upperLength, baseWidth: leg.baseWidth, tipWidth: leg.midWidth }),
            extrude
        ),
        [leg.upperLength, leg.baseWidth, leg.midWidth, extrude]
    )

    const lowerSegmentGeometry = useMemo(
        () => new THREE.ExtrudeGeometry(
            buildLegSegmentShape({ length: leg.lowerLength, baseWidth: leg.midWidth, tipWidth: leg.tipWidth }),
            extrude
        ),
        [leg.lowerLength, leg.midWidth, leg.tipWidth, extrude]
    )

    const jointGeometry = useMemo(
        () => new THREE.ExtrudeGeometry(buildJointShape({ radius: leg.jointRadius }), extrude),
        [leg.jointRadius, extrude]
    )

    const propBladeGeometry = useMemo(
        () => new THREE.ExtrudeGeometry(buildPropBladeShape(propeller), thinExtrude),
        [propeller.bladeLength, propeller.bladeWidth, propeller.hubRadius, thinExtrude]
    )

    const propHubGeometry = useMemo(
        () => new THREE.ExtrudeGeometry(buildPropHubShape(propeller), extrude),
        [propeller.hubRadius, extrude]
    )

    const geo = {
        upperSegment: upperSegmentGeometry,
        lowerSegment: lowerSegmentGeometry,
        joint: jointGeometry,
        propBlade: propBladeGeometry,
        propHub: propHubGeometry,
    }

    const legCfg = {
        legColor: leg.color,
        jointColor: leg.jointColor,
        bodyRadius: leg.bodyRadius,
        upperLength: leg.upperLength,
        lowerLength: leg.lowerLength,
        elbowRad: (leg.elbowDeg * Math.PI) / 180,
        propeller,
    }

    // Four legs, evenly spread from startAngleDeg (default 45/135/225/315 = X configuration)
    const legAngles = useMemo(() => {
        const start = (leg.startAngleDeg * Math.PI) / 180
        const spread = (leg.spreadDeg * Math.PI) / 180
        return [0, 1, 2, 3].map((i) => start + i * spread)
    }, [leg.startAngleDeg, leg.spreadDeg])

    return (
        <group position={position} rotation={[0, 0, rotation]}>
            {/* Rounded body */}
            <mesh geometry={bodyGeometry} position={[0, 0, 0.03]}>
                <meshPhysicalMaterial color={body.color} metalness={0.35} roughness={0.45} side={THREE.DoubleSide} />
            </mesh>

            {/* Center dome / sensor pod */}
            {body.domeRadius > 0 && (
                <mesh geometry={domeGeometry} position={[0, 0, 0.045]}>
                    <meshPhysicalMaterial color={body.domeColor} metalness={0.2} roughness={0.2} side={THREE.DoubleSide} />
                </mesh>
            )}

            {/* Four elbowed legs, each with a propeller at the tip */}
            {legAngles.map((angle, i) => (
                <Leg key={i} geo={geo} cfg={legCfg} baseAngle={angle} />
            ))}
        </group>
    )
}
