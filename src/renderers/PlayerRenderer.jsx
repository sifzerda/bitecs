// src/renderers/PlayerRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { playerQuery } from '../ecs/constants/queries.js'
import { Position, Rotation } from '../ecs/constants/components.js'

// ============================================================
// SHIP CONFIG — every adjustable number lives here.
// Change a value, ship updates. No shape-function editing needed
// unless you want a fundamentally different silhouette.
// ============================================================

const SHIP_CONFIG = {

    nose: {
        color: "#e33b2e",
        length: 0.6,        // tip y-position
        baseY: 0.45,         // where the base of the triangle sits
        baseWidth: 0.35,     // full width at the base (half-width used internally)
        z: 0.03,
    },

    wing: {
        color: "#ff8a1e",
        rootX: 0.165,         // inner point, near body, top
        rootY: 0.45,
        tipX: 0.80,          // outer wingtip position
        tipY: -0.35,
        trailX: 0.7,        // trailing edge point (tip side)
        trailY: -0.5,
        innerX: 0.001,         // trailing edge point (body side)
        innerY: -0.09,
        z: 0,
    },

    wingtip: {
        color: "#3fa62e",
        width: 0.05,
        height: 0.40,
        offsetX: 0.75,        // matches wing.tipX roughly, positions the cap
        offsetY: -0.50,
        z: 0.01,
    },

    spine: {
        color: "#3fd0d8",
        width: 0.30,
        topY: 0.5,
        bottomY: -0.20,
        z: 0.02,
    },

    pod: {
        color: "#3f4fcc",
        width: 0.12,
        height: 0.32,
        cornerRadius: 0.06,
        spacingX: 0.20,      // half-distance between the two pods
        offsetY: -0.25,
        z: 0.04,
    },

    extrudeDepth: 0.03,
}

// ============================================================
// Shape builders — parameterized, read from a config slice
// ============================================================

function buildNoseShape(cfg) {
    const halfW = cfg.baseWidth / 2
    const shape = new THREE.Shape()
    shape.moveTo(0, cfg.length)
    shape.lineTo(halfW, cfg.baseY)
    shape.lineTo(-halfW, cfg.baseY)
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

function buildSpineShape(cfg) {
    const halfW = cfg.width / 2
    const shape = new THREE.Shape()
    shape.moveTo(-halfW, cfg.topY)
    shape.lineTo(halfW, cfg.topY)
    shape.lineTo(halfW, cfg.bottomY)
    shape.lineTo(-halfW, cfg.bottomY)
    shape.closePath()
    return shape
}

function buildTipShape(cfg) {
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

function buildPodShape(cfg) {
    const w = cfg.width
    const h = cfg.height
    const r = cfg.cornerRadius
    const shape = new THREE.Shape()

    shape.moveTo(-w / 2 + r, h / 2)
    shape.lineTo(w / 2 - r, h / 2)
    shape.quadraticCurveTo(w / 2, h / 2, w / 2, h / 2 - r)
    shape.lineTo(w / 2, -h / 2 + r)
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2 - r, -h / 2)
    shape.lineTo(-w / 2 + r, -h / 2)
    shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2, -h / 2 + r)
    shape.lineTo(-w / 2, h / 2 - r)
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2 + r, h / 2)
    shape.closePath()
    return shape
}

export function PlayerRenderer() {

    const groupRef = useRef()
    const extrude = { depth: SHIP_CONFIG.extrudeDepth, bevelEnabled: false }

    const noseGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildNoseShape(SHIP_CONFIG.nose), extrude), [])
    const wingGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildWingShape(SHIP_CONFIG.wing), extrude), [])
    const spineGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildSpineShape(SHIP_CONFIG.spine), extrude), [])
    const tipGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildTipShape(SHIP_CONFIG.wingtip), extrude), [])
    const podGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildPodShape(SHIP_CONFIG.pod), extrude), [])

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

    const { nose, wing, wingtip, spine, pod } = SHIP_CONFIG

    return (
        <group ref={groupRef}>

            {/* Wings */}
            <mesh geometry={wingGeometry} position={[0, 0, wing.z]}>
                <meshStandardMaterial color={wing.color} metalness={0.2} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>
            <mesh geometry={wingGeometry} position={[0, 0, wing.z]} rotation={[0, Math.PI, 0]}>
                <meshStandardMaterial color={wing.color} metalness={0.2} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>

            {/* Wingtip caps */}
            <mesh geometry={tipGeometry} position={[wingtip.offsetX, wingtip.offsetY, wingtip.z]}>
                <meshStandardMaterial color={wingtip.color} metalness={0.2} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>
            <mesh geometry={tipGeometry} position={[-wingtip.offsetX, wingtip.offsetY, wingtip.z]}>
                <meshStandardMaterial color={wingtip.color} metalness={0.2} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>

            {/* Spine */}
            <mesh geometry={spineGeometry} position={[0, 0, spine.z]}>
                <meshStandardMaterial color={spine.color} metalness={0.2} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>

            {/* Nose */}
            <mesh geometry={noseGeometry} position={[0, 0, nose.z]}>
                <meshStandardMaterial color={nose.color} metalness={0.2} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>

            {/* Twin pods */}
            <mesh geometry={podGeometry} position={[pod.spacingX, pod.offsetY, pod.z]}>
                <meshStandardMaterial color={pod.color} metalness={0.2} roughness={0.5} side={THREE.DoubleSide} />
            </mesh>
            <mesh geometry={podGeometry} position={[-pod.spacingX, pod.offsetY, pod.z]}>
                <meshStandardMaterial color={pod.color} metalness={0.2} roughness={0.5} side={THREE.DoubleSide} />
            </mesh>

        </group>
    )
}