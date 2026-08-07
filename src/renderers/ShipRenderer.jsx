// src/renderers/ShipRenderer.jsx

import { useRef, useState, useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { world } from '../ecs/constants/world.js'
import { playerQuery, bossQuery } from '../ecs/constants/queries.js'
import { Position, Rotation, BossType } from '../ecs/constants/components.js'
import { BOSSES } from '../ecs/constants/bosses.js'
import { RENDER_ORDER } from './WeaponMount.jsx'

/* ============================================================
   ASSETS
   ============================================================ */

const PLAYER_SVG = '/ship_svgs/00_player.svg'

const BOSS_SVG_BY_KEY = {
    shotgun: '/ship_svgs/01_shotgunboss.svg',
    machinegun: '/ship_svgs/02_machinegunboss.svg',
    cryogun: '/ship_svgs/03_cryogunboss.svg',
    grenadegun: '/ship_svgs/04_grenadelauncherboss.svg',
    acidthrowergun: '/ship_svgs/05_acidthrowerboss.svg',
    missilegun: '/ship_svgs/06_missilelauncherboss.svg',
    flamethrowergun: '/ship_svgs/07_flamethrowerboss.svg',
    lasergun: '/ship_svgs/08_lasergunboss.svg',
    arcgun: '/ship_svgs/09_arcgunboss.svg',
    plasmagun: '/ship_svgs/10_plasmagunboss.svg',
}

const FALLBACK_BOSS_SVG = BOSS_SVG_BY_KEY.shotgun

const PLAYER_COCKPIT_GLASS_CFG = {
    offsetX: 0,
    offsetY: 0.137,
    width: 0.05,
    height: 0.09,
    lensColor: '#00eaff',
}

/* ============================================================
   SIZE
   ============================================================ */

const PX_TO_WORLD = 1 / 35
const PLAYER_SIZE = 220 * PX_TO_WORLD
const BOSS_SIZE = 220 * PX_TO_WORLD

/* ============================================================
   SHARED SVG ELEMENT
   ============================================================ */

function ShipImage({ src, size }) {
    const texture = useTexture(src)

    useEffect(() => {
        if (texture.__configured) return
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = 8
        texture.needsUpdate = true
        texture.__configured = true
    }, [texture])

    return (
        <mesh renderOrder={RENDER_ORDER.ship}>
            <planeGeometry args={[size, size]} />
            <meshBasicMaterial
                map={texture}
                transparent
                alphaTest={0.05}
                side={THREE.DoubleSide}
                toneMapped={false}
            />
        </mesh>
    )
}

/* ============================================================
   COCKPIT GLASS OVERLAY
   ============================================================
*/

const GLASS_VERTEX_SHADER = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`

const GLASS_FRAGMENT_SHADER = /* glsl */ `
    uniform float uTime;
    uniform vec3 uLensColor;
    varying vec2 vUv;

    void main() {
        vec2 c = vUv - 0.5;
        float dist = length(c) * 2.0;

        float mask = smoothstep(1.0, 0.35, dist);
        if (mask <= 0.001) discard;

        float rim = pow(clamp(dist, 0.0, 1.0), 2.0);

        float hueShift = 0.5 + 0.5 * sin(uTime * 0.6 + dist * 3.0 + c.x * 2.0);
        vec3 shiftA = vec3(0.10, 0.85, 0.65); // teal
        vec3 shiftB = vec3(0.55, 0.15, 1.00); // violet
        vec3 iridescent = mix(shiftA, shiftB, hueShift);

        vec3 color = mix(uLensColor, iridescent, 0.35 + 0.35 * rim);

        float streak = smoothstep(0.06, 0.0, abs(c.x + c.y - sin(uTime * 1.3) * 0.6));
        color += streak * 0.5;

        float alpha = mask * 0.82;
        gl_FragColor = vec4(color, alpha);
    }
`

function CockpitGlassOverlay({ cfg, shipSize }) {
    const materialRef = useRef(null)

    const uniforms = useRef({
        uTime: { value: 0 },
        uLensColor: { value: new THREE.Color(cfg?.lensColor ?? '#00eaff') },
    })

    useEffect(() => {
        if (cfg?.lensColor) uniforms.current.uLensColor.value.set(cfg.lensColor)
    }, [cfg?.lensColor])

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
        }
    })

    if (!cfg) return null

    const width = (cfg.width ?? 0.32) * shipSize
    const height = (cfg.height ?? 0.40) * shipSize
    const offsetX = (cfg.offsetX ?? 0) * (shipSize / 2)
    const offsetY = (cfg.offsetY ?? 0.28) * (shipSize / 2)

    return (
        <mesh
            position={[offsetX, offsetY, 0.005]}
            renderOrder={RENDER_ORDER.cockpitGlass}
        >
            <planeGeometry args={[width, height]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={GLASS_VERTEX_SHADER}
                fragmentShader={GLASS_FRAGMENT_SHADER}
                uniforms={uniforms.current}
                transparent
                depthTest={false}
                side={THREE.DoubleSide}
                toneMapped={false}
            />
        </mesh>
    )
}

/* ============================================================
   PROPELLER OVERLAY
   ============================================================
*/

function buildPropellerBladeShape(radius, bladeWidth) {
    const shape = new THREE.Shape()
    const hubR = radius * 0.18
    const halfW = bladeWidth / 2

    shape.moveTo(-halfW * 0.4, hubR)
    shape.quadraticCurveTo(-halfW, hubR + radius * 0.35, -halfW * 0.55, hubR + radius * 0.85)
    shape.quadraticCurveTo(-halfW * 0.2, hubR + radius, 0, hubR + radius)
    shape.quadraticCurveTo(halfW * 0.2, hubR + radius, halfW * 0.55, hubR + radius * 0.85)
    shape.quadraticCurveTo(halfW, hubR + radius * 0.35, halfW * 0.4, hubR)
    shape.closePath()
    return shape
}

function buildHubShape(radius) {
    const shape = new THREE.Shape()
    shape.absarc(0, 0, radius * 0.18, 0, Math.PI * 2, false)
    return shape
}

function PropellerFan({ mount, shipSize }) {
    const spinRef = useRef()

    const radius = mount.radius ?? 0.22
    const bladeCount = mount.bladeCount ?? 3
    const bladeColor = mount.bladeColor ?? '#5f5f5f'
    const hubColor = mount.hubColor ?? '#111111'
    const spinSpeed = (mount.spinSpeed ?? 10) * (mount.direction ?? 1)

    const worldRadius = radius * shipSize
    const offsetX = (mount.offsetX ?? 0) * (shipSize / 2)
    const offsetY = (mount.offsetY ?? 0) * (shipSize / 2)

    const bladeGeometry = useMemo(
        () => new THREE.ShapeGeometry(buildPropellerBladeShape(worldRadius, worldRadius * 0.32)),
        [worldRadius]
    )
    const hubGeometry = useMemo(
        () => new THREE.ShapeGeometry(buildHubShape(worldRadius)),
        [worldRadius]
    )

    const bladeAngles = useMemo(
        () => Array.from({ length: bladeCount }, (_, i) => (Math.PI * 2 * i) / bladeCount),
        [bladeCount]
    )

    useFrame((_, delta) => {
        if (spinRef.current) {
            spinRef.current.rotation.z += spinSpeed * delta
        }
    })

    return (
        <group position={[offsetX, offsetY, 0.008]} renderOrder={RENDER_ORDER.propeller}>
            <group ref={spinRef}>
                {bladeAngles.map((angle, i) => (
                    <mesh key={i} geometry={bladeGeometry} rotation={[0, 0, angle]}>
                        <meshBasicMaterial
                            color={bladeColor}
                            side={THREE.DoubleSide}
                            transparent
                            depthTest={false}
                            toneMapped={false}
                        />
                    </mesh>
                ))}
                <mesh geometry={hubGeometry}>
                    <meshBasicMaterial
                        color={hubColor}
                        side={THREE.DoubleSide}
                        transparent
                        depthTest={false}
                        toneMapped={false}
                    />
                </mesh>
            </group>
        </group>
    )
}

const PROP_BLUR_VERTEX_SHADER = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`

const PROP_BLUR_FRAGMENT_SHADER = /* glsl */ `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uSpeed;
    varying vec2 vUv;

    void main() {
        vec2 c = vUv - 0.5;

        // narrow vertical ellipse — the foreshortened silhouette of a
        // disc spinning on an axis pointing toward/away from the viewer
        float d = length(vec2(c.x * 3.4, c.y * 1.05));
        float mask = smoothstep(1.0, 0.55, d);
        if (mask <= 0.001) discard;

        // fast flicker reads as motion-blur rather than a static shape
        float flicker = 0.55 + 0.45 * sin(uTime * uSpeed * 6.0);

        // bright hub at the mount point
        float hub = smoothstep(0.20, 0.0, length(c));

        vec3 color = uColor + hub * 0.6;
        float alpha = mask * (0.30 + 0.25 * flicker) + hub * 0.5;

        gl_FragColor = vec4(color, alpha);
    }
`

function PropellerBlur({ mount, shipSize }) {
    const materialRef = useRef(null)

    const radius = mount.radius ?? 0.22
    const worldRadius = radius * shipSize
    const offsetX = (mount.offsetX ?? 0) * (shipSize / 2)
    const offsetY = (mount.offsetY ?? 0) * (shipSize / 2)
    const spinSpeed = mount.spinSpeed ?? 10

    const uniforms = useRef({
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(mount.bladeColor ?? '#5f5f5f') },
        uSpeed: { value: spinSpeed },
    })

    useEffect(() => {
        uniforms.current.uColor.value.set(mount.bladeColor ?? '#5f5f5f')
    }, [mount.bladeColor])

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
        }
    })

    const width = worldRadius * 0.55
    const height = worldRadius * 2.3

    return (
        <mesh position={[offsetX, offsetY, 0.008]} renderOrder={RENDER_ORDER.propeller}>
            <planeGeometry args={[width, height]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={PROP_BLUR_VERTEX_SHADER}
                fragmentShader={PROP_BLUR_FRAGMENT_SHADER}
                uniforms={uniforms.current}
                transparent
                depthTest={false}
                side={THREE.DoubleSide}
                toneMapped={false}
            />
        </mesh>
    )
}

function PropellerMount({ mount, shipSize }) {
    return mount.sideways
        ? <PropellerBlur mount={mount} shipSize={shipSize} />
        : <PropellerFan mount={mount} shipSize={shipSize} />
}

function PropellerOverlay({ propellers, shipSize }) {
    if (!propellers || propellers.length === 0) return null

    return (
        <>
            {propellers.map((mount, i) => (
                <PropellerMount
                    key={mount.mountKey ?? i}
                    mount={mount}
                    shipSize={shipSize}
                />
            ))}
        </>
    )
}

/* ============================================================
   PLAYER
   ============================================================ */

export function PlayerRenderer() {
    const groupRef = useRef(null)

    const [hasPlayer, setHasPlayer] = useState(false)
    const hasPlayerRef = useRef(false)

    useFrame(() => {
        const group = groupRef.current

        if (!group) return

        const players = playerQuery(world)

        if (!players.length) {
            group.visible = false
            if (hasPlayerRef.current) {
                hasPlayerRef.current = false
                setHasPlayer(false)
            }
            return
        }

        const eid = players[0]

        const x = Position.x?.[eid]
        const y = Position.y?.[eid]

        if (x === undefined || y === undefined) {
            group.visible = false
            return
        }

        group.visible = true
        group.position.set(x, y, 0)
        const angle = Rotation.angle?.[eid] ?? Rotation?.[eid] ?? 0
        group.rotation.z = angle

        if (!hasPlayerRef.current) {
            hasPlayerRef.current = true
            setHasPlayer(true)
        }
    })

    return (
        <group ref={groupRef}>
            {hasPlayer && (
                <>
                    <ShipImage
                        src={PLAYER_SVG}
                        size={PLAYER_SIZE}
                    />
                    <CockpitGlassOverlay
                        cfg={PLAYER_COCKPIT_GLASS_CFG}
                        shipSize={PLAYER_SIZE}
                    />
                </>
            )}
        </group>
    )
}

/* ============================================================
   BOSS TYPE
   ============================================================ */

function getBossTypeIndex(eid) {

    if (BossType?.typeIndex?.[eid] !== undefined) {
        return BossType.typeIndex[eid]
    }
    if (BossType?.[eid] !== undefined) {
        return BossType[eid]
    }
    return 0
}

function getBossCfg(eid) {
    const typeIndex = getBossTypeIndex(eid)
    return BOSSES[typeIndex] ?? null
}

function getBossSvgSrc(bossCfg) {
    if (!bossCfg) return FALLBACK_BOSS_SVG
    return BOSS_SVG_BY_KEY[bossCfg.key] ?? FALLBACK_BOSS_SVG
}

/* ============================================================
   BOSS RENDERER
   ============================================================ */

export function BossRenderer() {
    const groupRef = useRef(null)

    const [hasBoss, setHasBoss] = useState(false)
    const hasBossRef = useRef(false)

    const [svgSrc, setSvgSrc] = useState(FALLBACK_BOSS_SVG)
    const [bossCfg, setBossCfg] = useState(null)
    const lastEidRef = useRef(null)
    const lastTypeRef = useRef(null)

    useFrame(() => {
        const group = groupRef.current
        if (!group) return
        const bosses = bossQuery(world)
        const eid = bosses[0]

        /* ----------------------------------------------------
        No boss
        ---------------------------------------------------- */

        if (eid === undefined) {
            group.visible = false
            lastEidRef.current = null
            lastTypeRef.current = null

            if (hasBossRef.current) {
                hasBossRef.current = false
                setHasBoss(false)
            }
            return
        }

        /* ----------------------------------------------------
        Position
        ---------------------------------------------------- */

        const x = Position.x?.[eid]
        const y = Position.y?.[eid]

        if (x === undefined || y === undefined) {
            group.visible = false
            return
        }

        group.visible = true
        group.position.set(x, y, 0.15)

        /* ----------------------------------------------------
        Rotation
        ---------------------------------------------------- */
        const angle = Rotation.angle?.[eid] ?? Rotation?.[eid] ?? 0
        group.rotation.z = angle

        /* ----------------------------------------------------
        Boss Type
        ---------------------------------------------------- */

        const typeIndex = getBossTypeIndex(eid)

        if (lastEidRef.current !== eid || lastTypeRef.current !== typeIndex) {
            lastEidRef.current = eid
            lastTypeRef.current = typeIndex
            const cfg = getBossCfg(eid)
            setBossCfg(cfg)
            setSvgSrc(getBossSvgSrc(cfg))
        }

        if (!hasBossRef.current) {
            hasBossRef.current = true
            setHasBoss(true)
        }
    })

    return (
        <group ref={groupRef} visible={false}>
            {hasBoss && (
                <>
                    <ShipImage src={svgSrc} size={BOSS_SIZE} />
                    <CockpitGlassOverlay cfg={bossCfg?.cockpitGlass} shipSize={BOSS_SIZE} />
                    <PropellerOverlay propellers={bossCfg?.propellers} shipSize={BOSS_SIZE} />
                </>
            )}
        </group>
    )
}