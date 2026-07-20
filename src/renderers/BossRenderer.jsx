// src/renderers/BossRenderer.jsx

import { useMemo, useRef, createRef, useSyncExternalStore } from "react"
import { useFrame, useLoader } from "@react-three/fiber"
import { useControls, folder } from "leva"
import * as THREE from "three"
import { bossQuery } from "../ecs/constants/queries.js"
import { Position, Health, Rotation, BossType } from "../ecs/constants/components.js"
import { BOSSES } from "../ecs/constants/bosses.js"
import { subscribePreviewGunConfigOverride, getPreviewGunConfigOverride } from "../debug/debugState.js"
import { WeaponMount } from "./WeaponMount.jsx"

import lightWool from "../assets/light-wool.png"

export const HULL_TEXTURES = {
    "Light Wool": lightWool,
}

const MAX_BOSSES = 4 // pool size for real spawned bosses only — no reserved debug slot anymore
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
    shape.absarc(0, 0, rOuter, Math.PI * 0.60, -Math.PI * 0.85, false)
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
    const round = THREE.MathUtils.clamp(cfg.roundness ?? 0, 0, 1)
    const shape = new THREE.Shape()

    if (round <= 0.001) {
        shape.moveTo(0, cfg.length)
        shape.lineTo(halfW, 0)
        shape.lineTo(-halfW, 0)
        shape.closePath()
        return shape
    }

    const shoulderY = cfg.length * (1 - round * 0.55)
    const shoulderX = halfW * (1 - round * 0.3)
    const capY = cfg.length * (1 - round * 0.35)

    shape.moveTo(-halfW, 0)
    shape.lineTo(halfW, 0)
    shape.lineTo(shoulderX, shoulderY)
    shape.quadraticCurveTo(halfW * round * 0.6, capY, 0, cfg.length)
    shape.quadraticCurveTo(-halfW * round * 0.6, capY, -shoulderX, shoulderY)
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

function buildTailBoomShape(cfg) {
    const halfBase = cfg.baseWidth / 2
    const halfTip = cfg.tipWidth / 2
    const startY = cfg.startY
    const endY = startY - cfg.length
    const shape = new THREE.Shape()
    shape.moveTo(-halfBase, startY)
    shape.lineTo(halfBase, startY)
    shape.lineTo(halfTip, endY)
    shape.lineTo(-halfTip, endY)
    shape.closePath()
    return shape
}

function buildBoomFinShape(cfg) {
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

function buildLandingLegShape(cfg) {
    const halfW = cfg.legWidth / 2
    const shape = new THREE.Shape()
    shape.moveTo(0, halfW)
    shape.lineTo(cfg.legLength, 0)
    shape.lineTo(0, -halfW)
    shape.closePath()
    return shape
}

function buildLandingWheelShape(cfg) {
    const shape = new THREE.Shape()
    shape.absarc(0, 0, cfg.wheelRadius, 0, Math.PI * 2, false)
    return shape
}

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

    const bladeAngles = useMemo(() => Array.from({ length: cfg.bladeCount }, (_, i) => (Math.PI * 2 * i) / cfg.bladeCount), [cfg.bladeCount])

    const disc = (
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
    )

    return (
        <group position={position}>
            {cfg.sideways !== false
                ? <group rotation={[Math.PI / 2, 0, 0]}>{disc}</group>
                : disc}
        </group>
    )
}

// ============================================================

function createHullMaterial(partCfg, hullTextureCfg, texture) {
    const material = new THREE.MeshPhysicalMaterial({
        side: THREE.DoubleSide,
        color: new THREE.Color(partCfg.color),
        metalness: 0.2,
        roughness: partCfg.roughness ?? 0.5,
        map: texture ?? null,
    })

    const opacity = hullTextureCfg.enabled ? hullTextureCfg.opacity : 0
    const uniforms = { uHullOpacity: { value: opacity } }
    material.userData.hullUniforms = uniforms

    if (texture) {
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.repeat.set(hullTextureCfg.repeatX, hullTextureCfg.repeatY)
        texture.needsUpdate = true
    }

    material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms)
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

// ============================================================

function Panel({ geometry, position, color, metalness = 0.2, roughness = 0.6, material = null }) {
    if (material) {
        return <mesh geometry={geometry} position={position} material={material} />
    }
    return (<mesh geometry={geometry} position={position}><meshPhysicalMaterial color={color} metalness={metalness} roughness={roughness} side={THREE.DoubleSide} /></mesh>)
}

function MirroredPair({ geometry, position, color, metalness = 0.2, roughness = 0.6, rotationZ = 0, flipX = true, rotateY = false, flipZAngle = false, material = null }) {
    const [x, y, z] = position
    const sharedMaterial = material ?? (
        <meshPhysicalMaterial color={color} metalness={metalness} roughness={roughness} side={THREE.DoubleSide} />
    )

    return (
        <>
            <mesh geometry={geometry} position={[x, y, z]} rotation={[0, 0, rotationZ]} material={material ?? undefined}>
                {material ? null : sharedMaterial}
            </mesh>
            <mesh geometry={geometry} position={[flipX ? -x : x, y, z]} rotation={[0, rotateY ? Math.PI : 0, flipZAngle ? -rotationZ : rotationZ]} material={material ?? undefined}>
                {material ? null : sharedMaterial}
            </mesh>
        </>
    )
}

// ============================================================

export function BossShip({ groupRef, geo, cfg, hullMaterials, visible = false, isPreviewSlot = false }) {
    const { fuselage, cockpit, wing, wingPanel, wingtip, decal, cockpitGlass, engineIntake, hullVent, racingStripe, noseSpike, tailFin, exhaustPort, horn, propeller, tailBoom, boomFin, centerPropeller, landingGear, gun } = cfg

    // Only the single debug preview slot ever reads the live-tuned gun
    // config from GunPanel; every real spawned boss slot gets `null` here
    // and WeaponMount falls back to the gun type's normal static config.
    const previewGunConfigOverride = useSyncExternalStore(
        subscribePreviewGunConfigOverride,
        getPreviewGunConfigOverride,
        getPreviewGunConfigOverride
    )
    const gunConfigOverride = isPreviewSlot ? previewGunConfigOverride : null

    return (
        <group ref={groupRef} visible={false}>

            <MirroredPair geometry={geo.wing} position={[0, 0, 0]} color={wing.color} flipX={false} rotateY />

            {landingGear.enabled && (
                <>
                    <MirroredPair geometry={geo.landingLeg} position={[landingGear.offsetX, landingGear.offsetY, landingGear.zOffset]} color={landingGear.legColor} metalness={0.5} roughness={0.5} />
                    <MirroredPair geometry={geo.landingWheel} position={[landingGear.offsetX + landingGear.legLength, landingGear.offsetY, landingGear.zOffset + 0.001]} color={landingGear.wheelColor} metalness={0.2} roughness={0.6} />
                </>
            )}

            <MirroredPair geometry={geo.wingPanel} position={[0, 0, 0.01]} color={wingPanel.color} material={hullMaterials.wingPanel} flipX={false} rotateY />
            <MirroredPair geometry={geo.wingtip} position={[wingtip.offsetX, wingtip.offsetY, wingtip.zOffset]} color={wingtip.color} />

            {horn.enabled && (
                <>
                    <mesh geometry={geo.horn} position={[horn.offsetX, horn.offsetY, 0.028]} rotation={[0, 0, Math.PI * 3]}>
                        <meshPhysicalMaterial color={horn.color} metalness={0.15} roughness={0.4} side={THREE.DoubleSide} />
                    </mesh>
                    <mesh geometry={geo.horn} position={[-horn.offsetX, horn.offsetY, 0.028]} rotation={[0, Math.PI, -Math.PI * 3]}>
                        <meshPhysicalMaterial color={horn.color} metalness={0.15} roughness={0.4} side={THREE.DoubleSide} />
                    </mesh>
                </>
            )}

            {tailFin.enabled && (<MirroredPair geometry={geo.tailFin} position={[tailFin.offsetX, tailFin.offsetY, 0.025]} color={tailFin.color} rotationZ={-geo.tailFinSplayRad} rotateY flipZAngle />)}
            {tailBoom.enabled && (<Panel geometry={geo.tailBoom} position={[0, 0, 0.02]} color={tailBoom.color} metalness={0.3} roughness={0.55} />)}
            {tailBoom.enabled && boomFin.enabled && (<MirroredPair geometry={geo.boomFin} position={[boomFin.offsetX, geo.boomFinY + boomFin.offsetY, 0.026]} color={boomFin.color} rotationZ={-geo.boomFinSplayRad} rotateY flipZAngle />)}

            {exhaustPort.enabled && (
                <Panel
                    geometry={geo.cockpit}
                    position={[0, 0, cockpit.zOffset]}
                    color={cockpit.color}
                    metalness={0.3}
                    roughness={0.3}
                />
            )}

            {engineIntake.enabled && (
                <MirroredPair
                    geometry={geo.engineIntake}
                    position={[engineIntake.offsetX, engineIntake.offsetY, 0.032]}
                    color={engineIntake.color}
                    metalness={0.5}
                    roughness={0.5}
                />
            )}

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

            <Panel geometry={geo.fuselage} position={[0, 0, 0.03]} color={fuselage.color} roughness={0.5} material={hullMaterials.fuselage} />

            {noseSpike.enabled && (
                <Panel
                    geometry={geo.noseSpike}
                    position={[0.0, fuselage.tipY + noseSpike.offsetY, noseSpike.zOffset]}
                    color={noseSpike.color}
                    metalness={0.6}
                    roughness={0.35}
                />
            )}

            {decal.enabled && (
                <MirroredPair
                    geometry={geo.decal}
                    position={[decal.offsetX, decal.offsetY, decal.zOffset]}
                    color={decal.color}
                    metalness={0.1}
                    roughness={0.4}
                    rotationZ={geo.decalTiltRad}
                    flipZAngle
                />
            )}

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

            <Panel geometry={geo.cockpit} position={[0, 0, 0.05]} color={cockpit.color} metalness={0.3} roughness={0.3} />

            {cockpitGlass.enabled && (
                <mesh
                    geometry={geo.cockpitGlass}
                    position={[0, 0, cockpitGlass.zOffset]}
                >
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

            {centerPropeller.enabled && (
                <Propeller
                    hubGeometry={geo.centerPropellerHub}
                    bladeGeometry={geo.centerPropellerBlade}
                    cfg={centerPropeller}
                    position={[0, centerPropeller.offsetY, centerPropeller.zOffset]}
                />
            )}

            {gun?.enabled && (
                <WeaponMount gunCfg={gun} configOverride={gunConfigOverride} />
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

    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    geometry.attributes.uv.needsUpdate = true
}

// ============================================================

export function buildBossAssets(cfg, textures) {
    const { fuselage, cockpit, wing, wingPanel, wingtip, horn, decal, cockpitGlass,
        engineIntake, hullVent, racingStripe, noseSpike, tailFin, exhaustPort,
        propeller, centerPropeller, tailBoom, boomFin, landingGear, hullTexture, general } = cfg

    const extrude = { depth: general.extrudeDepth, bevelEnabled: false }
    const thinExtrude = { depth: general.extrudeDepth * 0.5, bevelEnabled: false }

    const fuselageGeometry = new THREE.ExtrudeGeometry(buildFuselageShape(fuselage), extrude)
    applyPlanarUVs(fuselageGeometry)

    const wingPanelGeometry = new THREE.ExtrudeGeometry(buildWingPanelShape(wing, wingPanel.inset), extrude)
    applyPlanarUVs(wingPanelGeometry)

    const texture = textures[hullTexture.textureKey]

    const ventOffsets = []
    {
        const total = (hullVent.count - 1) * hullVent.spacing
        for (let i = 0; i < hullVent.count; i++) { ventOffsets.push(-total / 2 + i * hullVent.spacing) }
    }

    const shrunkCockpit = {
        topY: cockpit.topY - cockpitGlass.inset,
        topWidth: Math.max(0.01, cockpit.topWidth - cockpitGlass.inset * 0.4),
        midY: cockpit.midY,
        midWidth: Math.max(0.01, cockpit.midWidth - cockpitGlass.inset),
        bottomY: cockpit.bottomY + cockpitGlass.inset * 0.5,
        bottomWidth: Math.max(0.01, cockpit.bottomWidth - cockpitGlass.inset),
    }

    const geo = {
        fuselage: fuselageGeometry,
        cockpit: new THREE.ExtrudeGeometry(buildCockpitShape(cockpit), extrude),
        wing: new THREE.ExtrudeGeometry(buildWingShape(wing), extrude),
        wingPanel: wingPanelGeometry,
        wingtip: new THREE.ExtrudeGeometry(buildWingtipShape(wingtip), extrude),
        horn: new THREE.ExtrudeGeometry(buildHornShape(horn), extrude),
        decal: new THREE.ExtrudeGeometry(buildStripeShape(decal), thinExtrude),
        decalTiltRad: (decal.tiltDeg * Math.PI) / 180,
        cockpitGlass: new THREE.ExtrudeGeometry(buildCockpitShape(shrunkCockpit), thinExtrude),
        engineIntake: new THREE.ExtrudeGeometry(buildEngineIntakeShape(engineIntake), extrude),
        hullVent: new THREE.ExtrudeGeometry(buildHullVentShape(hullVent), thinExtrude),
        ventOffsets,
        racingStripe: new THREE.ExtrudeGeometry(buildStripeShape(racingStripe), thinExtrude),
        racingStripeTiltRad: (racingStripe.tiltDeg * Math.PI) / 180,
        noseSpike: new THREE.ExtrudeGeometry(buildNoseSpikeShape(noseSpike), extrude),
        tailFin: new THREE.ExtrudeGeometry(buildTailFinShape(tailFin), extrude),
        tailFinSplayRad: (tailFin.splayDeg * Math.PI) / 180,
        exhaustPort: new THREE.ExtrudeGeometry(buildEngineIntakeShape(exhaustPort), extrude),
        propellerBlade: new THREE.ExtrudeGeometry(buildPropellerBladeShape(propeller), thinExtrude),
        propellerHub: new THREE.ExtrudeGeometry(buildPropellerHubShape(propeller), extrude),
        centerPropellerBlade: new THREE.ExtrudeGeometry(buildPropellerBladeShape(centerPropeller), thinExtrude),
        centerPropellerHub: new THREE.ExtrudeGeometry(buildPropellerHubShape(centerPropeller), extrude),
        tailBoom: new THREE.ExtrudeGeometry(buildTailBoomShape({ ...tailBoom, startY: fuselage.tailY }), extrude),
        boomFinY: fuselage.tailY - tailBoom.length,
        boomFin: new THREE.ExtrudeGeometry(buildBoomFinShape(boomFin), extrude),
        boomFinSplayRad: (boomFin.splayDeg * Math.PI) / 180,
        landingLeg: new THREE.ExtrudeGeometry(buildLandingLegShape(landingGear), thinExtrude),
        landingWheel: new THREE.ExtrudeGeometry(buildLandingWheelShape(landingGear), thinExtrude),
    }

    const hullMaterials = {
        fuselage: createHullMaterial(fuselage, hullTexture, texture),
        wingPanel: createHullMaterial(wingPanel, hullTexture, texture),
    }

    return { cfg, geo, hullMaterials }
}

// ============================================================

export function BossRenderer() {

    const healthBar = useControls('Boss / Health Bar', {
        bgColor: '#ff0000',
        fgColor: '#44ff88',
        width: BAR_WIDTH,
        height: BAR_HEIGHT,
        offsetY: BAR_OFFSET,
    }, { collapsed: true })

    const textureKeys = useMemo(() => [...new Set(BOSSES.map((b) => b.hullTexture.textureKey))], [])
    const loadedTextures = useLoader(THREE.TextureLoader, textureKeys.map((k) => HULL_TEXTURES[k]))
    const textures = useMemo(() => Object.fromEntries(textureKeys.map((k, i) => [k, loadedTextures[i]])), [textureKeys, loadedTextures])
    const bossAssets = useMemo(() => BOSSES.map((cfg) => buildBossAssets(cfg, textures)), [textures])
    const groupRefs = useMemo(() => Array.from({ length: MAX_BOSSES }, () => bossAssets.map(() => createRef())), [bossAssets])

    const bgBarRef = useRef()
    const fgBarRef = useRef()

    useFrame(() => {
        const bosses = bossQuery()

        for (let slot = 0; slot < MAX_BOSSES; slot++) {
            const eid = slot < bosses.length ? bosses[slot] : null
            const activeType = eid !== null ? BossType.typeIndex[eid] : -1

            for (let t = 0; t < bossAssets.length; t++) {
                const group = groupRefs[slot][t].current
                if (!group) continue

                if (t === activeType) {
                    group.visible = true
                    group.position.set(Position.x[eid], Position.y[eid], 0)
                    group.rotation.set(0, 0, Rotation[eid])
                } else {
                    group.visible = false
                }
            }
        }

        /////////////// debug

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
            {groupRefs.map((slotRefs, slot) =>
                bossAssets.map((assets, t) => (
                    <BossShip
                        key={`${slot}-${assets.cfg.key}`}
                        groupRef={slotRefs[t]}
                        geo={assets.geo}
                        cfg={assets.cfg}
                        hullMaterials={assets.hullMaterials}
                    />
                ))
            )}

            <instancedMesh ref={bgBarRef} args={[null, null, MAX_BOSSES]} frustumCulled={false}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial color={healthBar.bgColor} />
            </instancedMesh>

            <instancedMesh ref={fgBarRef} args={[null, null, MAX_BOSSES]} frustumCulled={false}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial color={healthBar.fgColor} />
            </instancedMesh>
        </>
    )
}