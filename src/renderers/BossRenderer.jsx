// src/renderers/BossRenderer.jsx

import { useMemo, useRef, createRef } from "react"
import { useFrame } from "@react-three/fiber"
import { useControls } from "leva"
import * as THREE from "three"
import { bossQuery } from "../ecs/constants/queries.js"
import { world } from "../ecs/constants/world.js"
import { Position, Health, Rotation } from "../ecs/constants/components.js"

const MAX_BOSSES = 4
const BAR_WIDTH = 3.0
const BAR_HEIGHT = 0.2
const BAR_OFFSET = 2.2

const _barMatrix = new THREE.Matrix4()
const _barPosition = new THREE.Vector3()
const _barRotation = new THREE.Quaternion()
const _barScale = new THREE.Vector3()
const _scaleZero = new THREE.Vector3(0, 0, 0)

// ============================================================

function buildDiscShape(cfg) {
    const shape = new THREE.Shape()
    shape.absellipse(0, 0, cfg.radiusX, cfg.radiusY, 0, Math.PI * 2, false, 0)
    return shape
}

function buildRingShape(cfg) {
    const shape = new THREE.Shape()
    shape.absellipse(0, 0, cfg.outerRadiusX, cfg.outerRadiusY, 0, Math.PI * 2, false, 0)
    const hole = new THREE.Path()
    hole.absellipse(0, 0, cfg.innerRadiusX, cfg.innerRadiusY, 0, Math.PI * 2, true, 0)
    shape.holes.push(hole)
    return shape
}

function buildCircleShape(radius) {
    const shape = new THREE.Shape()
    shape.absarc(0, 0, radius, 0, Math.PI * 2, false)
    return shape
}

function buildRimPanelShape(cfg) {
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

function buildTrapezoidPanelShape(cfg) {

    const shape = new THREE.Shape()

    const outerWidth = cfg.outerWidth
    const innerWidth = cfg.innerWidth
    const length = cfg.length

    shape.moveTo(-outerWidth * 0.5, length * 0.5)
    shape.lineTo(outerWidth * 0.5, length * 0.5)

    shape.lineTo(innerWidth * 0.5, -length * 0.5)
    shape.lineTo(-innerWidth * 0.5, -length * 0.5)

    shape.closePath()

    return shape
}

// ============================================================

function BossSaucer({ groupRef, geo, cfg }) {
    const {
        disc,
        dome,
        redRing,
        blackRings,
        podLights,
        rimPanels,
        discWedges,
        spin,
        wobble
    } = cfg

    const spinRef = useRef()

    const spinState = useRef({
        current: spin.speed,
        target: spin.speed,
        timer: 0,
        nextFlip: spin.directionChangeMin + Math.random() * (spin.directionChangeMax - spin.directionChangeMin),
    })

    const lightRefs = useRef([])

    const lightPhases = useMemo(() => Array.from({ length: podLights.count }, () => ({
                phase: Math.random() * Math.PI * 2,
                freq: podLights.pulseMinFreq + Math.random() * (podLights.pulseMaxFreq - podLights.pulseMinFreq),
            })),
        [podLights.count, podLights.pulseMinFreq, podLights.pulseMaxFreq])

    const lightPositions = useMemo(() => {
        return Array.from({ length: podLights.count }, (_, i) => {
            const angle = (Math.PI * 2 * i) / Math.max(1, podLights.count)
            return [Math.cos(angle) * podLights.ringRadiusX, Math.sin(angle) * podLights.ringRadiusY, podLights.zOffset]
        })
    }, [podLights.count, podLights.ringRadiusX, podLights.ringRadiusY, podLights.zOffset])

    const panelLayout = useMemo(() => {
        return Array.from({ length: rimPanels.count }, (_, i) => {
            const angle = (Math.PI * 2 * i) / Math.max(1, rimPanels.count)
            return {
                position: [Math.cos(angle) * rimPanels.ringRadiusX, Math.sin(angle) * rimPanels.ringRadiusY, rimPanels.zOffset],
                rotationZ: angle + Math.PI / 2,
            }
        })
    }, [rimPanels.count, rimPanels.ringRadiusX, rimPanels.ringRadiusY, rimPanels.zOffset])

    const wedgeLayout = useMemo(() => {

        return Array.from({ length: discWedges.count }, (_, i) => {

                const angle = (Math.PI * 2 * i) / Math.max(1, discWedges.count)
                const radius = (discWedges.innerRadius + discWedges.outerRadius) * 0.5

                return {
                    position: [
                        Math.cos(angle) * radius,
                        Math.sin(angle) * radius,
                        discWedges.zOffset
                    ],
                    rotationZ: angle + Math.PI * 0.5
                }
            }
        )

    }, [
        discWedges.count,
        discWedges.innerRadius,
        discWedges.outerRadius,
        discWedges.zOffset
    ])

    useFrame((state, delta) => {
        const t = state.clock.elapsedTime
        const s = spinState.current

        s.timer += delta
        if (s.timer >= s.nextFlip) {
            s.timer = 0
            s.nextFlip = spin.directionChangeMin + Math.random() * (spin.directionChangeMax - spin.directionChangeMin)
            const sign = Math.random() < 0.5 ? -1 : 1
            s.target = sign * spin.speed * (0.6 + Math.random() * 0.8)
        }
        s.current = THREE.MathUtils.lerp(s.current, s.target, delta * spin.ease)

        if (spinRef.current) {
            spinRef.current.rotation.z += s.current * delta
            spinRef.current.rotation.x = Math.sin(t * wobble.speed) * wobble.amount
            spinRef.current.rotation.y = Math.cos(t * wobble.speed * 0.77) * wobble.amount * 0.6
        }

        for (let i = 0; i < lightRefs.current.length; i++) {
            const mesh = lightRefs.current[i]
            if (!mesh) continue
            const { phase, freq } = lightPhases[i]
            const pulse = 0.15 + 0.85 * (0.5 + 0.5 * Math.sin(t * freq + phase))
            mesh.material.emissiveIntensity = pulse * podLights.maxEmissive
        }
    })

    return (
        <group ref={groupRef} visible={false}>
            <group ref={spinRef}>

                {/* grey disc body */}
                <mesh
                    geometry={geo.disc}
                    position={[0, 0, disc.zOffset]}>
                    <meshStandardMaterial color={disc.color} metalness={0.4} roughness={0.5} side={THREE.DoubleSide} />
                </mesh>

                {discWedges.enabled &&
                    wedgeLayout.map(({ position, rotationZ }, i) => (

                            <mesh
                                key={i}
                                geometry={geo.wedge}
                                position={position}
                                rotation={[0, 0, rotationZ]}>
                                <meshStandardMaterial
                                    color={discWedges.color}
                                    metalness={0.3}
                                    roughness={0.8}
                                />
                            </mesh>

                        ))
                }

                {/* black concentric panel rings */}
                {geo.blackRings.map((ringGeo, i) => (
                    <mesh key={i} geometry={ringGeo} position={[0, 0, 0.03]}>
                        <meshStandardMaterial color={blackRings.color} metalness={0.3} roughness={0.7} side={THREE.DoubleSide} />
                    </mesh>
                ))}

                {/* reflective glass panels around the outer rim */}
                {rimPanels.enabled && panelLayout.map(({ position: pos, rotationZ }, i) => (
                    <mesh key={i} geometry={geo.rimPanel} position={pos} rotation={[0, 0, rotationZ]}>
                        <meshPhysicalMaterial
                            color={rimPanels.color}
                            metalness={0.1}
                            roughness={0.05}
                            transmission={0.6}
                            thickness={0.05}
                            clearcoat={1}
                            clearcoatRoughness={0}
                            envMapIntensity={1.5}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                ))}

                {/* evenly spaced bluish pod lights — each pulses independently */}
                {podLights.enabled && lightPositions.map((pos, i) => (
                    <mesh key={i} geometry={geo.podLight} position={pos} ref={(el) => (lightRefs.current[i] = el)}>
                        <meshStandardMaterial
                            color={podLights.color}
                            emissive={podLights.color}
                            emissiveIntensity={1}
                            toneMapped={false}
                        />
                    </mesh>
                ))}

                {/* red ring around the dome's base */}
                <mesh geometry={geo.redRing} position={[0, 0, 0.04]}>
                    <meshStandardMaterial
                        color={redRing.color}
                        emissive={redRing.color}
                        emissiveIntensity={0.4}
                        metalness={0.2}
                        roughness={0.4}
                        side={THREE.DoubleSide}
                    />
                </mesh>

                {/* reflective glass dome, centred */}
                <mesh geometry={geo.dome} position={[0, 0, 0.05]}>
                    <meshPhysicalMaterial
                        color={dome.color}
                        metalness={0}
                        roughness={0.02}
                        transmission={0.85}
                        thickness={0.4}
                        ior={1.4}
                        clearcoat={1}
                        clearcoatRoughness={0}
                        envMapIntensity={2}
                        side={THREE.DoubleSide}
                    />
                </mesh>

            </group>
        </group>
    )
}

// ============================================================

export function BossRenderer() {

    const general = useControls('Boss / General', {
        extrudeDepth: { value: 0.02, min: 0.005, max: 0.1, step: 0.005 },
    }, { collapsed: true })

    const disc = useControls('Boss / Disc', {

        color: '#2d3338',

        radiusX: {
            value: 0.95,
            min: 0.2,
            max: 2,
            step: 0.01,
        },

        radiusY: {
            value: 0.95,
            min: 0.2,
            max: 2,
            step: 0.01,
        },

        zOffset: {
            value: 0,
            min: -0.2,
            max: 0.2,
            step: 0.001,
        }

    })

    const dome = useControls('Boss / Dome', {
        color: '#26ff96',
        radiusX: { value: 0.36, min: 0.05, max: 1, step: 0.01 },
        radiusY: { value: 0.36, min: 0.05, max: 1, step: 0.01 },
    }, { collapsed: true })

    const redRing = useControls('Boss / Red Ring', {
        color: '#00ff84',
        tube: { value: 0.02, min: 0.005, max: 0.1, step: 0.005 },
    }, { collapsed: true })

    const blackRings = useControls('Boss / Black Panel Rings', {
        color: '#000000',
        count: { value: 8, min: 0, max: 8, step: 1 },
        tube: { value: 0.02, min: 0.003, max: 0.05, step: 0.001 },
        startRadius: { value: 0.39, min: 0.1, max: 2, step: 0.01 },
        endRadius: { value: 0.94, min: 0.1, max: 2, step: 0.01 },
    }, { collapsed: true })

    const podLights = useControls('Boss / Pod Lights', {
        enabled: true,
        color: '#3bbeff',
        count: { value: 29, min: 0, max: 32, step: 1 },
        radius: { value: 0.04, min: 0.01, max: 0.2, step: 0.005 },
        ringRadiusX: { value: 0.92, min: 0, max: 2, step: 0.01 },
        ringRadiusY: { value: 0.92, min: 0, max: 2, step: 0.01 },
        zOffset: { value: 0.10, min: 0, max: 0.1, step: 0.001 },
        maxEmissive: { value: 6.0, min: 0.2, max: 6, step: 0.1 },
        pulseMinFreq: { value: 1.75, min: 0.05, max: 3, step: 0.05 },
        pulseMaxFreq: { value: 3.05, min: 0.1, max: 5, step: 0.05 },
    }, { collapsed: true })

    const rimPanels = useControls('Boss / Rim Glass Panels', {
        enabled: true,
        color: '#48ffa6',
        count: { value: 18, min: 0, max: 48, step: 1 },
        width: { value: 0.12, min: 0.01, max: 0.5, step: 0.005 },
        length: { value: 0.16, min: 0.01, max: 0.5, step: 0.005 },
        ringRadiusX: { value: 0.66, min: 0, max: 2.2, step: 0.01 },
        ringRadiusY: { value: 0.69, min: 0, max: 2.2, step: 0.01 },
        zOffset: { value: 0.10, min: 0, max: 0.1, step: 0.001 },
    }, { collapsed: true })

    const discWedges = useControls('Boss / Disc Wedges', {

        enabled: true,

        count: {
            value: 36,
            min: 0,
            max: 72,
            step: 1
        },

        innerRadius: {
            value: 0.00,
            min: 0,
            max: 2,
            step: 0.01
        },

        outerRadius: {
            value: 0.98,
            min: 0,
            max: 2,
            step: 0.01
        },

        innerWidth: {
            value: 0.01,
            min: 0.01,
            max: 0.3,
            step: 0.005
        },

        outerWidth: {
            value: 0.05,
            min: 0.01,
            max: 0.4,
            step: 0.005
        },

        length: {
            value: 1.0,
            min: 0.01,
            max: 1,
            step: 0.01
        },

        zOffset: {
            value: 0.04,
            min: 0,
            max: 0.2,
            step: 0.001
        },

        color: '#000000'

    })

    const spin = useControls('Boss / Spin', {
        speed: { value: 3.25, min: 0, max: 4, step: 0.05 },
        directionChangeMin: { value: 20, min: 0.5, max: 20, step: 0.5 },
        directionChangeMax: { value: 20, min: 0.5, max: 20, step: 0.5 },
        ease: { value: 0.5, min: 0.05, max: 3, step: 0.05 },
    }, { collapsed: true })

    const wobble = useControls('Boss / Wobble', {
        amount: { value: 0.40, min: 0, max: 0.4, step: 0.005 },
        speed: { value: 0.50, min: 0, max: 4, step: 0.05 },
    }, { collapsed: true })

    const healthBar = useControls('Boss / Health Bar', {
        bgColor: '#ff0000',
        fgColor: '#44ff88',
        width: { value: BAR_WIDTH, min: 1, max: 6, step: 0.1 },
        height: { value: BAR_HEIGHT, min: 0.05, max: 0.6, step: 0.01 },
        offsetY: { value: BAR_OFFSET, min: 0.5, max: 4, step: 0.05 },
    }, { collapsed: true })

    const cfg = {
        disc,
        dome,
        redRing,
        blackRings,
        podLights,
        rimPanels,
        discWedges,
        spin,
        wobble
    }

    // ========================================= 

    const extrude = useMemo(() => ({ depth: general.extrudeDepth, bevelEnabled: false }), [general.extrudeDepth])
    const thinExtrude = useMemo(() => ({ depth: general.extrudeDepth * 0.5, bevelEnabled: false }), [general.extrudeDepth])

    const discGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildDiscShape(disc), extrude), [disc.radiusX, disc.radiusY, extrude])

    const domeGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildDiscShape(dome), thinExtrude), [dome.radiusX, dome.radiusY, thinExtrude])

    const redRingGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildRingShape({
            outerRadiusX: dome.radiusX + redRing.tube,
            outerRadiusY: dome.radiusY + redRing.tube,
            innerRadiusX: dome.radiusX,
            innerRadiusY: dome.radiusY,
        }), thinExtrude),
        [dome.radiusX, dome.radiusY, redRing.tube, thinExtrude])

    const blackRingsGeometry = useMemo(() => {
        const count = blackRings.count
        if (count <= 0) return []
        const geos = []
        for (let i = 0; i < count; i++) {
            const t = count === 1 ? 0 : i / (count - 1)
            const r = THREE.MathUtils.lerp(blackRings.startRadius, blackRings.endRadius, t)
            geos.push(new THREE.ExtrudeGeometry(buildRingShape({
                outerRadiusX: r + blackRings.tube,
                outerRadiusY: r + blackRings.tube,
                innerRadiusX: r,
                innerRadiusY: r,
            }), thinExtrude))
        }
        return geos
    }, [blackRings.count, blackRings.tube, blackRings.startRadius, blackRings.endRadius, thinExtrude])

    const podLightGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildCircleShape(podLights.radius), thinExtrude), [podLights.radius, thinExtrude])
    const rimPanelGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildRimPanelShape(rimPanels), thinExtrude), [rimPanels.width, rimPanels.length, thinExtrude])
    const wedgeGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildTrapezoidPanelShape(discWedges), thinExtrude),
        [
            discWedges.innerWidth,
            discWedges.outerWidth,
            discWedges.length,
            thinExtrude
        ])

    const geo = {
        disc: discGeometry,
        dome: domeGeometry,
        redRing: redRingGeometry,
        blackRings: blackRingsGeometry,
        podLight: podLightGeometry,
        rimPanel: rimPanelGeometry,
        wedge: wedgeGeometry,
    }

    // =============================================== 

    const groupRefs = useMemo(() => Array.from({ length: MAX_BOSSES }, () => createRef()), [])
    const bgBarRef = useRef()
    const fgBarRef = useRef()

    useFrame(() => {

        const bosses = bossQuery(world)

        // ============================================ 

        for (let i = 0; i < MAX_BOSSES; i++) {
            const group = groupRefs[i].current
            if (!group) continue

            if (i < bosses.length) {
                const eid = bosses[i]
                group.visible = true
                group.position.set(Position.x[eid], Position.y[eid], 0)
                group.rotation.set(0, 0, Rotation[eid])
            } else {
                group.visible = false
            }
        }

        // ==================================== 

        const bgBar = bgBarRef.current
        const fgBar = fgBarRef.current
        if (!bgBar || !fgBar) return

        for (let i = 0; i < bosses.length; i++) {
            const eid = bosses[i]
            _barPosition.set(Position.x[eid], Position.y[eid] + healthBar.offsetY, 0)
            _barScale.set(healthBar.width, healthBar.height, 1)
            _barMatrix.compose(_barPosition, _barRotation, _barScale)
            bgBar.setMatrixAt(i, _barMatrix)
        }
        for (let i = bosses.length; i < MAX_BOSSES; i++) {
            _barPosition.set(0, 0, 0)
            _barMatrix.compose(_barPosition, _barRotation, _scaleZero)
            bgBar.setMatrixAt(i, _barMatrix)
        }
        bgBar.instanceMatrix.needsUpdate = true
        bgBar.count = MAX_BOSSES

        for (let i = 0; i < bosses.length; i++) {
            const eid = bosses[i]
            const pct = Math.max(0, Health.current[eid] / Health.max[eid])
            const fillWidth = healthBar.width * pct
            const offsetX = (healthBar.width - fillWidth) * 0.5

            _barPosition.set(Position.x[eid] - offsetX, Position.y[eid] + healthBar.offsetY, 0.01)
            _barScale.set(fillWidth, healthBar.height, 1)
            _barMatrix.compose(_barPosition, _barRotation, _barScale)
            fgBar.setMatrixAt(i, _barMatrix)
        }
        for (let i = bosses.length; i < MAX_BOSSES; i++) {
            _barPosition.set(0, 0, 0)
            _barMatrix.compose(_barPosition, _barRotation, _scaleZero)
            fgBar.setMatrixAt(i, _barMatrix)
        }
        fgBar.instanceMatrix.needsUpdate = true
        fgBar.count = MAX_BOSSES

    })

    return (
        <>
            {groupRefs.map((ref, i) => (
                <BossSaucer key={i} groupRef={ref} geo={geo} cfg={cfg} />
            ))}

            {/* Health bar background */}
            <instancedMesh ref={bgBarRef} args={[null, null, MAX_BOSSES]} frustumCulled={false}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial color={healthBar.bgColor} />
            </instancedMesh>

            {/* Health bar fill */}
            <instancedMesh ref={fgBarRef} args={[null, null, MAX_BOSSES]} frustumCulled={false}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial color={healthBar.fgColor} />
            </instancedMesh>
        </>
    )
}
