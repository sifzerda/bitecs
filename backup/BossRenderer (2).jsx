// src/renderers/BossRenderer.jsx

import { useMemo, useRef, createRef, useEffect } from "react"
import { useFrame, useLoader } from "@react-three/fiber"
import { useControls, folder } from "leva"
import * as THREE from "three"
import { bossQuery } from "../ecs/constants/queries.js"
import { world } from "../ecs/constants/world.js"
import { Position, Health, Rotation } from "../ecs/constants/components.js"

import lightWool from "../assets/light-wool.png"

const HULL_TEXTURES = {
    "Light Wool": lightWool,
}

const MAX_BOSSES = 4
const BAR_WIDTH = 3.0
const BAR_HEIGHT = 0.2
const BAR_OFFSET = 2.2

// ============================================================

const _barMatrix = new THREE.Matrix4()
const _barPosition = new THREE.Vector3()
const _barRotation = new THREE.Quaternion()
const _barScale = new THREE.Vector3()
const _scaleZero = new THREE.Vector3(0, 0, 0)

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

function buildHornShape(cfg) {
    const shape = new THREE.Shape()
    const rOuter = cfg.length
    const rInner = cfg.length * 0.93
    // Outer arc
    shape.absarc(0, 0, rOuter, Math.PI * 0.60, -Math.PI * 0.85, false)
    // Inner arc back
    shape.absarc(0, 0, rInner, -Math.PI * 0.70, Math.PI * 0.80, true)
    shape.closePath()
    return shape
}

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

function buildNoseSpikeShape(cfg) {
    const halfW = cfg.width / 2
    const shape = new THREE.Shape()
    shape.moveTo(0, cfg.length)
    shape.lineTo(halfW, 0)
    shape.lineTo(-halfW, 0)
    shape.closePath()
    return shape
}

function buildTailFinShape(cfg) {
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

// ============================================================
// Propeller — top-down silhouette: a circular hub plus N paddle-shaped
// blades radiating outward. The whole assembly spins around its own
// local Z axis (the "up" axis as seen from the top-down camera), so
// from a top-down view it reads as a spinning propeller disc.
// ============================================================

function buildPropellerBladeShape(cfg) {
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

function buildPropellerHubShape(cfg) {
    const shape = new THREE.Shape()
    shape.absarc(0, 0, cfg.hubRadius, 0, Math.PI * 2, false)
    return shape
}

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
        <group position={position}>
            <group ref={spinRef}>
                <mesh geometry={hubGeometry}>
                    <meshPhysicalMaterial color={cfg.hubColor} metalness={0.6} roughness={0.3} side={THREE.DoubleSide} />
                </mesh>
                {bladeAngles.map((angle, i) => (
                    <mesh key={i} geometry={bladeGeometry} rotation={[0, 0, angle]}>
                        <meshPhysicalMaterial color={cfg.bladeColor} metalness={0.35} roughness={0.45} side={THREE.DoubleSide} />
                    </mesh>
                ))}
            </group>
        </group>
    )
}

// ============================================================
// Hull texture material — meshPhysicalMaterial extended via onBeforeCompile
// to blend a tiling overlay texture over the base color, with a live-tunable
// opacity uniform (0 = texture invisible, 1 = fully blended).
// ============================================================

function createHullMaterial(initialTexture) {
    const material = new THREE.MeshPhysicalMaterial({
        side: THREE.DoubleSide,
        map: initialTexture,
    })

 material.userData.hullUniforms = {
        uHullOpacity: { value: 0 },
    }

   material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, material.userData.hullUniforms)

        shader.fragmentShader = shader.fragmentShader
            .replace(
                '#include <common>',
                `
                #include <common>
                uniform float uHullOpacity;
                `
            )
            .replace(
                '#include <map_fragment>',
                `
                vec3 hullBaseColor = diffuseColor.rgb;
                #include <map_fragment>
                diffuseColor.rgb = mix(hullBaseColor, diffuseColor.rgb, uHullOpacity);
                `
            )

        material.userData.shader = shader
    }

    material.customProgramCacheKey = () => 'hull-textured'

    return material
}

function useHullMaterial(
    baseColor,
    metalness,
    roughness,
    texture,
    opacity,
    repeatX,
    repeatY,
    enabled
) {
    const material = useMemo(() => createHullMaterial(texture), [])

    useEffect(() => {
        material.color = new THREE.Color(baseColor)
        material.metalness = metalness
        material.roughness = roughness
        material.needsUpdate = true
    }, [material, baseColor, metalness, roughness])

    useEffect(() => {

        if (material.map !== texture) {
            material.map = texture
            material.needsUpdate = true
        }

        if (texture) {
            texture.wrapS = THREE.RepeatWrapping
            texture.wrapT = THREE.RepeatWrapping
            texture.repeat.set(repeatX, repeatY)
            texture.needsUpdate = true
        }

        const opacityValue = enabled ? opacity : 0

        material.userData.hullUniforms.uHullOpacity.value = opacityValue

        if (material.userData.shader) {
            material.userData.shader.uniforms.uHullOpacity.value = opacityValue
        }

    }, [material, texture, opacity, repeatX, repeatY, enabled])

    return material
}

// ============================================================

function Panel({ geometry, position, color, metalness = 0.2, roughness = 0.6, material = null }) {
    if (material) {
        return <mesh geometry={geometry} position={position} material={material} />
    }
    return (
        <mesh geometry={geometry} position={position}>
            <meshPhysicalMaterial color={color} metalness={metalness} roughness={roughness} side={THREE.DoubleSide} />
        </mesh>
    )
}

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
    material = null,
}) {
    const [x, y, z] = position
    const sharedMaterial = material ?? (
        <meshPhysicalMaterial color={color} metalness={metalness} roughness={roughness} side={THREE.DoubleSide} />
    )

    return (
        <>
            <mesh
                geometry={geometry}
                position={[x, y, z]}
                rotation={[0, 0, rotationZ]}
                material={material ?? undefined}
            >
                {material ? null : sharedMaterial}
            </mesh>
            <mesh
                geometry={geometry}
                position={[flipX ? -x : x, y, z]}
                rotation={[0, rotateY ? Math.PI : 0, flipZAngle ? -rotationZ : rotationZ]}
                material={material ?? undefined}
            >
                {material ? null : sharedMaterial}
            </mesh>
        </>
    )
}

// ============================================================

function BossShip({ groupRef, geo, cfg, hullMaterials }) {
    const { fuselage, cockpit, wing, wingPanel, wingtip, decal, cockpitGlass,
        engineIntake, hullVent, racingStripe, noseSpike, tailFin, exhaustPort, horn, propeller } = cfg

    return (
        <group ref={groupRef} visible={false}>

            {/* Wings — both sides */}
            <MirroredPair geometry={geo.wing} position={[0, 0, 0]} color={wing.color} flipX={false} rotateY />

            {/* Wing panels — both sides */}
            <MirroredPair geometry={geo.wingPanel} position={[0, 0, 0.01]} color={wingPanel.color} material={hullMaterials.wingPanel} flipX={false} rotateY />

            {/* Wingtip pods — both sides */}
            <MirroredPair geometry={geo.wingtip} position={[wingtip.offsetX, wingtip.offsetY, 0.02]} color={wingtip.color} />

            {/* Bull horns — both sides, swept outward from the hull */}
            {horn.enabled && (
                <>
                    {/* Left horn */}
                    <mesh
                        geometry={geo.horn}
                        position={[horn.offsetX, horn.offsetY, 0.028]}
                        rotation={[0, 0, Math.PI * 3]}
                    >
                        <meshPhysicalMaterial
                            color={horn.color}
                            metalness={0.15}
                            roughness={0.4}
                            side={THREE.DoubleSide}
                        />
                    </mesh>

                    {/* Right horn */}
                    <mesh
                        geometry={geo.horn}
                        position={[-horn.offsetX, horn.offsetY, 0.028]}
                        rotation={[0, Math.PI, -Math.PI * 3]}
                    >
                        <meshPhysicalMaterial
                            color={horn.color}
                            metalness={0.15}
                            roughness={0.4}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                </>
            )}

            {/* Tail fins — both sides */}
            {tailFin.enabled && (
                <MirroredPair
                    geometry={geo.tailFin}
                    position={[tailFin.offsetX, tailFin.offsetY, 0.025]}
                    color={tailFin.color}
                    rotationZ={-geo.tailFinSplayRad}
                    rotateY
                    flipZAngle
                />
            )}

            {/* Exhaust port */}
            {exhaustPort.enabled && (
                <Panel
                    geometry={geo.exhaustPort}
                    position={[exhaustPort.offsetX, fuselage.tailY + exhaustPort.offsetY, 0.032]}
                    color={exhaustPort.color}
                    metalness={0.4}
                    roughness={0.4}
                />
            )}

            {/* Engine intakes — both flanks */}
            {engineIntake.enabled && (
                <MirroredPair
                    geometry={geo.engineIntake}
                    position={[engineIntake.offsetX, engineIntake.offsetY, 0.032]}
                    color={engineIntake.color}
                    metalness={0.5}
                    roughness={0.5}
                />
            )}

            {/* Hull vents — a row on each flank */}
            {hullVent.enabled && geo.ventOffsets.map((dy, i) => (
                <MirroredPair
                    key={`vent-${i}`}
                    geometry={geo.hullVent}
                    position={[hullVent.offsetX, hullVent.offsetY + dy, 0.041]}
                    color={hullVent.color}
                    metalness={0.3}
                    roughness={0.7}
                />
            ))}

            {/* Fuselage */}
            <Panel geometry={geo.fuselage} position={[0, 0, 0.03]} color={fuselage.color} roughness={0.5} material={hullMaterials.fuselage} />

            {/* Nose spike */}
            {noseSpike.enabled && (
                <Panel
                    geometry={geo.noseSpike}
                    position={[0, fuselage.tipY, 0.032]}
                    color={noseSpike.color}
                    metalness={0.6}
                    roughness={0.35}
                />
            )}

            {/* Decal stripes — both sides */}
            {decal.enabled && (
                <MirroredPair
                    geometry={geo.decal}
                    position={[decal.offsetX, decal.offsetY, 0.041]}
                    color={decal.color}
                    metalness={0.1}
                    roughness={0.4}
                    rotationZ={geo.decalTiltRad}
                    flipZAngle
                />
            )}

            {/* Racing stripes — both sides */}
            {racingStripe.enabled && (
                <MirroredPair
                    geometry={geo.racingStripe}
                    position={[racingStripe.offsetX, racingStripe.offsetY, 0.042]}
                    color={racingStripe.color}
                    metalness={0.1}
                    roughness={0.35}
                    rotationZ={geo.racingStripeTiltRad}
                    flipZAngle
                />
            )}

            {/* Cockpit base */}
            <Panel geometry={geo.cockpit} position={[0, 0, 0.05]} color={cockpit.color} metalness={0.3} roughness={0.3} />

            {/* Cockpit glass */}
            {cockpitGlass.enabled && (
                <mesh geometry={geo.cockpitGlass} position={[0, 0, 0.05 + cockpitGlass.zOffset]}>
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
                        iridescenceThicknessRange={[cockpitGlass.iridescenceThicknessMin, cockpitGlass.iridescenceThicknessMax]}
                        attenuationColor={cockpitGlass.attenuationColor}
                        attenuationDistance={cockpitGlass.attenuationDistance}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}

            {/* Twin propellers — top-down, spinning, one on each side of the hull */}
            {propeller.enabled && (
                <>
                    <Propeller
                        hubGeometry={geo.propellerHub}
                        bladeGeometry={geo.propellerBlade}
                        cfg={propeller}
                        position={[propeller.offsetX, propeller.offsetY, propeller.zOffset]}
                    />
                    <Propeller
                        hubGeometry={geo.propellerHub}
                        bladeGeometry={geo.propellerBlade}
                        cfg={{ ...propeller, spinSpeed: -propeller.spinSpeed }}
                        position={[-propeller.offsetX, propeller.offsetY, propeller.zOffset]}
                    />
                </>
            )}

        </group>
    )
}

function applyPlanarUVs(geometry) {

    geometry.computeBoundingBox()

    const box = geometry.boundingBox

    const minX = box.min.x
    const minY = box.min.y

    const sizeX = Math.max(box.max.x - box.min.x, 0.0001)
    const sizeY = Math.max(box.max.y - box.min.y, 0.0001)

    const pos = geometry.attributes.position
    const uv = new Float32Array(pos.count * 2)

    for (let i = 0; i < pos.count; i++) {

        const x = pos.getX(i)
        const y = pos.getY(i)

        uv[i * 2 + 0] = (x - minX) / sizeX
        uv[i * 2 + 1] = (y - minY) / sizeY
    }

    geometry.setAttribute(
        'uv',
        new THREE.BufferAttribute(uv, 2)
    )

    geometry.attributes.uv.needsUpdate = true
}

// ============================================================

export function BossRenderer() {

    // ============================================================

    const general = useControls('Boss / General', {
        extrudeDepth: { value: 0.03, min: 0.005, max: 0.1, step: 0.005 },
    }, { collapsed: true })

    const fuselage = useControls('Boss / Fuselage', {
        color: '#ff3355',
        tipY: { value: 0.66, min: 0.2, max: 2, step: 0.01 },
        shoulderY: { value: 0.39, min: -1, max: 2, step: 0.01 },
        shoulderWidth: { value: 0.19, min: 0, max: 1, step: 0.01 },
        waistY: { value: -0.40, min: -1.5, max: 1.5, step: 0.01 },
        waistWidth: { value: 0.26, min: 0, max: 1, step: 0.01 },
        tailY: { value: -0.75, min: -2, max: 0, step: 0.01 },
        tailWidth: { value: 0.50, min: 0, max: 1, step: 0.01 },
        notchY: { value: -0.28, min: -2, max: 0, step: 0.01 },
    }, { collapsed: true })

    const cockpit = useControls('Boss / Cockpit', {
        color: '#3a6bd5',
        topY: { value: 0.62, min: 0, max: 2, step: 0.01 },
        topWidth: { value: 0.06, min: 0, max: 0.5, step: 0.01 },
        midY: { value: 0.14, min: -1, max: 1, step: 0.01 },
        midWidth: { value: 0.15, min: 0, max: 0.5, step: 0.01 },
        bottomY: { value: 0.04, min: -1, max: 1, step: 0.01 },
        bottomWidth: { value: 0.09, min: 0, max: 0.5, step: 0.01 },
    }, { collapsed: true })

    const wing = useControls('Boss / Wing', {
        color: '#8d001c',
        rootX: { value: 0.20, min: 0, max: 1, step: 0.01 },
        rootY: { value: 0.40, min: -1, max: 1, step: 0.01 },
        tipX: { value: 0.79, min: 0, max: 2, step: 0.01 },
        tipY: { value: -0.25, min: -1.5, max: 1.5, step: 0.01 },
        trailX: { value: 0.76, min: 0, max: 2, step: 0.01 },
        trailY: { value: -0.45, min: -1.5, max: 1.5, step: 0.01 },
        innerX: { value: 0.14, min: 0, max: 1, step: 0.01 },
        innerY: { value: -0.24, min: -1.5, max: 1.5, step: 0.01 },
    }, { collapsed: true })

    const wingPanel = useControls('Boss / Wing Panel', {
        color: '#ff3355',
        inset: { value: 0.08, min: 0, max: 0.4, step: 0.01 },
    }, { collapsed: true })

    const wingtip = useControls('Boss / Wingtip', {
        color: '#ffe605',
        width: { value: 0.07, min: 0, max: 0.3, step: 0.005 },
        height: { value: 0.34, min: 0, max: 1.5, step: 0.01 },
        offsetX: { value: 0.71, min: 0, max: 2, step: 0.01 },
        offsetY: { value: -0.31, min: -1.5, max: 1.5, step: 0.01 },
    }, { collapsed: true })

    const horn = useControls('Boss / Horn', {
        enabled: true,
        color: '#ffe605',
        baseWidth: { value: 0.09, min: 0, max: 0.4, step: 0.005 },
        length: { value: 0.82, min: 0, max: 1, step: 0.01 },
        curveAmount: { value: 0.18, min: 0, max: 0.6, step: 0.01 },
        offsetX: { value: 0.13, min: 0, max: 1, step: 0.01 },
        offsetY: { value: 0.07, min: -1.5, max: 1.5, step: 0.01 },
        sweepDeg: { value: 25, min: -90, max: 90, step: 1 },
        tiltDeg: { value: 8, min: -90, max: 90, step: 1 },
    }, { collapsed: true })

    const decal = useControls('Boss / Decal', {
        enabled: true,
        color: '#ffe605',
        width: { value: 0.07, min: 0, max: 0.3, step: 0.005 },
        length: { value: 0.76, min: 0, max: 2, step: 0.01 },
        offsetX: { value: 0.35, min: 0, max: 1, step: 0.01 },
        offsetY: { value: 0.00, min: -1, max: 1, step: 0.01 },
        tiltDeg: { value: -18, min: -90, max: 90, step: 1 },
    }, { collapsed: true })

    const cockpitGlass = useControls('Boss / Cockpit Glass', {
        enabled: true,
        inset: { value: 0.08, min: 0, max: 0.3, step: 0.01 },
        zOffset: { value: 0.05, min: -0.2, max: 0.3, step: 0.01 },
        color: "#90eeff",
        metalness: { value: 0, min: 0, max: 1, step: 0.01 },
        roughness: { value: 0.01, min: 0, max: 1, step: 0.005 },
        transmission: { value: 1, min: 0, max: 1, step: 0.01 },
        thickness: { value: 0.75, min: 0, max: 3, step: 0.01 },
        ior: { value: 1.52, min: 1, max: 2.5, step: 0.01 },
        clearcoat: { value: 1, min: 0, max: 1, step: 0.01 },
        clearcoatRoughness: { value: 0, min: 0, max: 1, step: 0.01 },
        envMapIntensity: { value: 8, min: 0, max: 15, step: 0.5 },
        iridescence: { value: 10, min: 0, max: 20, step: 0.5 },
        iridescenceIOR: { value: 1.35, min: 1, max: 2.5, step: 0.01 },
        iridescenceThicknessMin: { value: 180, min: 0, max: 1000, step: 10 },
        iridescenceThicknessMax: { value: 900, min: 0, max: 2000, step: 10 },
        attenuationColor: "#50a4ce",
        attenuationDistance: { value: 2.2, min: 0.1, max: 10, step: 0.1 },
    }, { collapsed: true })

    const engineIntake = useControls('Boss / Engine Intake', {
        enabled: true,
        color: '#3a6bd5',
        width: { value: 0.10, min: 0, max: 0.5, step: 0.01 },
        height: { value: 0.46, min: 0, max: 1, step: 0.01 },
        offsetX: { value: 0.35, min: 0, max: 1.5, step: 0.01 },
        offsetY: { value: -0.28, min: -1.5, max: 1.5, step: 0.01 },
    }, { collapsed: true })

    const hullVent = useControls('Boss / Hull Vent', {
        enabled: true,
        color: '#3a6bd5',
        count: { value: 8, min: 1, max: 16, step: 1 },
        width: { value: 0.13, min: 0, max: 0.5, step: 0.01 },
        height: { value: 0.05, min: 0, max: 0.3, step: 0.005 },
        spacing: { value: 0.07, min: 0.01, max: 0.3, step: 0.005 },
        offsetX: { value: 0.26, min: 0, max: 1, step: 0.01 },
        offsetY: { value: 0.00, min: -1, max: 1, step: 0.01 },
    }, { collapsed: true })

    const racingStripe = useControls('Boss / Racing Stripe', {
        enabled: true,
        color: '#ffe605',
        width: { value: 0.07, min: 0, max: 0.3, step: 0.005 },
        length: { value: 1.03, min: 0, max: 2, step: 0.01 },
        offsetX: { value: 0.45, min: 0, max: 1, step: 0.01 },
        offsetY: { value: -0.16, min: -1, max: 1, step: 0.01 },
        tiltDeg: { value: -2, min: -90, max: 90, step: 1 },
    }, { collapsed: true })

    const noseSpike = useControls('Boss / Nose Spike', {
        enabled: true,
        color: '#ffe605',
        length: { value: 0.13, min: 0, max: 1, step: 0.01 },
        width: { value: 0.07, min: 0, max: 0.5, step: 0.01 },
    }, { collapsed: true })

    const tailFin = useControls('Boss / Tail Fin', {
        enabled: true,
        color: '#ffe605',
        length: { value: 0.26, min: 0, max: 1, step: 0.01 },
        width: { value: 0.15, min: 0, max: 1, step: 0.01 },
        sweep: { value: 0.00, min: 0, max: 1, step: 0.01 },
        offsetX: { value: 0.67, min: 0, max: 1, step: 0.01 },
        offsetY: { value: -0.03, min: -1.5, max: 1.5, step: 0.01 },
        splayDeg: { value: 0, min: -45, max: 45, step: 1 },
    }, { collapsed: true })

    const exhaustPort = useControls('Boss / Exhaust Port', {
        enabled: true,
        color: '#3a6bd5',
        width: { value: 0.14, min: 0, max: 1, step: 0.01 },
        height: { value: 0.17, min: 0, max: 0.5, step: 0.01 },
        offsetX: { value: 0.00, min: -0.5, max: 0.5, step: 0.01 },
        offsetY: { value: 0.23, min: -0.5, max: 0.5, step: 0.01 },
    }, { collapsed: true })

    const propeller = useControls('Boss / Propeller', {
        enabled: true,
        bladeColor: '#222222',
        hubColor: '#555555',
        bladeCount: { value: 3, min: 2, max: 6, step: 1 },
        bladeLength: { value: 0.15, min: 0.02, max: 0.5, step: 0.01 },
        bladeWidth: { value: 0.05, min: 0.01, max: 0.2, step: 0.005 },
        hubRadius: { value: 0.03, min: 0.005, max: 0.15, step: 0.005 },
        offsetX: { value: 0.45, min: 0, max: 1.5, step: 0.01 },
        offsetY: { value: 0.10, min: -1, max: 1, step: 0.01 },
        zOffset: { value: 0.06, min: -0.2, max: 0.3, step: 0.005 },
        spinSpeed: { value: 6, min: -20, max: 20, step: 0.5 },
    }, { collapsed: true })

    const hullTextureCfg = useControls('Boss / Hull Texture', {
        enabled: false,
        texture: { value: "Light Wool", options: Object.keys(HULL_TEXTURES) },
        opacity: { value: 1.0, min: 0, max: 1, step: 0.01 },
        repeatX: { value: 1.0, min: 0.25, max: 16, step: 0.25 },
        repeatY: { value: 1.0, min: 0.25, max: 16, step: 0.25 },
    }, { collapsed: true })

    const healthBar = useControls('Boss / Health Bar', {
        bgColor: '#ff0000',
        fgColor: '#44ff88',
        width: { value: BAR_WIDTH, min: 1, max: 6, step: 0.1 },
        height: { value: BAR_HEIGHT, min: 0.05, max: 0.6, step: 0.01 },
        offsetY: { value: BAR_OFFSET, min: 0.5, max: 4, step: 0.05 },
    }, { collapsed: true })

    const cfg = {
        general, fuselage, cockpit, wing, wingPanel, wingtip, decal,
        cockpitGlass, engineIntake, hullVent, racingStripe, noseSpike,
        tailFin, exhaustPort, horn, propeller,
    }

    // ========================================= 
    // Hull texture — loaded once, shared across all boss instances
    // ========================================= 

    const hullTexture = useLoader(THREE.TextureLoader, HULL_TEXTURES[hullTextureCfg.texture])

    const fuselageHullMaterial = useHullMaterial(
        fuselage.color, 0.2, 0.5,
        hullTexture, hullTextureCfg.opacity, hullTextureCfg.repeatX, hullTextureCfg.repeatY, hullTextureCfg.enabled
    )

    const wingPanelHullMaterial = useHullMaterial(
    wingPanel.color,
    0.2,
    0.6,
    hullTexture,
    hullTextureCfg.opacity,
    hullTextureCfg.repeatX,
    hullTextureCfg.repeatY,
    hullTextureCfg.enabled
)

   const hullMaterials = {
    fuselage: fuselageHullMaterial,
    wingPanel: wingPanelHullMaterial,
}

    // ========================================= 

    const extrude = useMemo(() => ({ depth: general.extrudeDepth, bevelEnabled: false }), [general.extrudeDepth])
    const thinExtrude = useMemo(() => ({ depth: general.extrudeDepth * 0.5, bevelEnabled: false }), [general.extrudeDepth])

    const fuselageGeometry = useMemo(() => {
        const g = new THREE.ExtrudeGeometry(buildFuselageShape(fuselage), extrude)
        applyPlanarUVs(g)
        return g
    }, [fuselage.tipY, fuselage.shoulderY, fuselage.shoulderWidth, fuselage.waistY, fuselage.waistWidth, fuselage.tailY, fuselage.tailWidth, fuselage.notchY, extrude])

    const cockpitGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildCockpitShape(cockpit), extrude),
        [cockpit.topY, cockpit.topWidth, cockpit.midY, cockpit.midWidth, cockpit.bottomY, cockpit.bottomWidth, extrude])

    const wingGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildWingShape(wing), extrude),
        [wing.rootX, wing.rootY, wing.tipX, wing.tipY, wing.trailX, wing.trailY, wing.innerX, wing.innerY, extrude])

    const wingPanelGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildWingPanelShape(wing, wingPanel.inset), extrude),
        [wing, wingPanel.inset, extrude])

    const wingtipGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildWingtipShape(wingtip), extrude),
        [wingtip.width, wingtip.height, extrude])

    const hornGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildHornShape(horn), extrude),
        [horn.baseWidth, horn.length, horn.curveAmount, extrude])
    const hornSweepRad = useMemo(() => (horn.sweepDeg * Math.PI) / 180, [horn.sweepDeg])
    const hornTiltRad = useMemo(() => (horn.tiltDeg * Math.PI) / 180, [horn.tiltDeg])

    const decalGeometry = useMemo(() => new THREE.ExtrudeGeometry(buildStripeShape(decal), thinExtrude),
        [decal.width, decal.length, thinExtrude])
    const decalTiltRad = useMemo(() => (decal.tiltDeg * Math.PI) / 180, [decal.tiltDeg])

    const cockpitGlassGeometry = useMemo(() => {
        const g = cockpitGlass
        const shrunk = {
            topY: cockpit.topY - g.inset,
            topWidth: Math.max(0.01, cockpit.topWidth - g.inset * 0.4),
            midY: cockpit.midY,
            midWidth: Math.max(0.01, cockpit.midWidth - g.inset),
            bottomY: cockpit.bottomY + g.inset * 0.5,
            bottomWidth: Math.max(0.01, cockpit.bottomWidth - g.inset),
        }
        return new THREE.ExtrudeGeometry(buildCockpitShape(shrunk), thinExtrude)
    }, [cockpit, cockpitGlass.inset, thinExtrude])

    const engineIntakeGeometry = useMemo(
        () => new THREE.ExtrudeGeometry(buildEngineIntakeShape(engineIntake), extrude),
        [engineIntake.width, engineIntake.height, extrude]
    )

    const hullVentGeometry = useMemo(
        () => new THREE.ExtrudeGeometry(buildHullVentShape(hullVent), thinExtrude),
        [hullVent.width, hullVent.height, thinExtrude]
    )

    const racingStripeGeometry = useMemo(
        () => new THREE.ExtrudeGeometry(buildStripeShape(racingStripe), thinExtrude),
        [racingStripe.width, racingStripe.length, thinExtrude]
    )
    const racingStripeTiltRad = useMemo(() => (racingStripe.tiltDeg * Math.PI) / 180, [racingStripe.tiltDeg])

    const noseSpikeGeometry = useMemo(
        () => new THREE.ExtrudeGeometry(buildNoseSpikeShape(noseSpike), extrude),
        [noseSpike.length, noseSpike.width, extrude]
    )

    const ventOffsets = useMemo(() => {
        const offsets = []
        const total = (hullVent.count - 1) * hullVent.spacing
        for (let i = 0; i < hullVent.count; i++) {
            offsets.push(-total / 2 + i * hullVent.spacing)
        }
        return offsets
    }, [hullVent.count, hullVent.spacing])

    const tailFinGeometry = useMemo(
        () => new THREE.ExtrudeGeometry(buildTailFinShape(tailFin), extrude),
        [tailFin.length, tailFin.width, tailFin.sweep, extrude]
    )
    const tailFinSplayRad = useMemo(() => (tailFin.splayDeg * Math.PI) / 180, [tailFin.splayDeg])

    const exhaustPortGeometry = useMemo(
        () => new THREE.ExtrudeGeometry(buildEngineIntakeShape(exhaustPort), extrude),
        [exhaustPort.width, exhaustPort.height, extrude]
    )

    const propellerBladeGeometry = useMemo(
        () => new THREE.ExtrudeGeometry(buildPropellerBladeShape(propeller), thinExtrude),
        [propeller.bladeLength, propeller.bladeWidth, propeller.hubRadius, thinExtrude]
    )

    const propellerHubGeometry = useMemo(
        () => new THREE.ExtrudeGeometry(buildPropellerHubShape(propeller), extrude),
        [propeller.hubRadius, extrude]
    )

    const geo = {
        fuselage: fuselageGeometry,
        cockpit: cockpitGeometry,
        wing: wingGeometry,
        wingPanel: wingPanelGeometry,
        wingtip: wingtipGeometry,
        horn: hornGeometry,
        hornSweepRad,
        hornTiltRad,
        decal: decalGeometry,
        decalTiltRad,
        cockpitGlass: cockpitGlassGeometry,
        engineIntake: engineIntakeGeometry,
        hullVent: hullVentGeometry,
        ventOffsets,
        racingStripe: racingStripeGeometry,
        racingStripeTiltRad,
        noseSpike: noseSpikeGeometry,
        tailFin: tailFinGeometry,
        tailFinSplayRad,
        exhaustPort: exhaustPortGeometry,
        propellerBlade: propellerBladeGeometry,
        propellerHub: propellerHubGeometry,
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
                <BossShip key={i} groupRef={ref} geo={geo} cfg={cfg} hullMaterials={hullMaterials} />
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
