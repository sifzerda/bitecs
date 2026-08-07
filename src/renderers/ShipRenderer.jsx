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

        // ---------------------------------------------------------
        // COCKPIT GLASS SHAPE
        // ---------------------------------------------------------

        vec2 c = vUv - 0.5;

        // Slightly elongated oval
        float dist = length(vec2(c.x * 1.05, c.y * 1.12));

        float glassMask = smoothstep(0.52, 0.43, dist);

        if (glassMask <= 0.001)
            discard;


        // ---------------------------------------------------------
        // FAKE CURVED SURFACE NORMAL
        // Gives the flat plane a glass-like Fresnel response
        // ---------------------------------------------------------

        vec2 normalXY = c * 2.0;

        float radial = dot(normalXY, normalXY);

        float normalZ = sqrt(
            max(0.001, 1.0 - min(radial, 0.96))
        );

        vec3 normal = normalize(
            vec3(normalXY.x, normalXY.y, normalZ)
        );

        vec3 viewDir = vec3(0.0, 0.0, 1.0);

        float fresnel = pow(
            1.0 - max(dot(normal, viewDir), 0.0),
            3.2
        );

        fresnel = smoothstep(0.05, 0.95, fresnel);


        // ---------------------------------------------------------
        // IRIDESCENT COATING
        // ---------------------------------------------------------

        float angle =
            atan(c.y, c.x);

        float rainbow =
            sin(
                dist * 10.0
                - uTime * 0.35
                + angle * 1.8
            );

        rainbow = rainbow * 0.5 + 0.5;


        vec3 cyan = vec3(
            0.00,
            0.95,
            1.00
        );

        vec3 blue = vec3(
            0.05,
            0.30,
            1.00
        );

        vec3 violet = vec3(
            0.45,
            0.08,
            1.00
        );

        vec3 magenta = vec3(
            1.00,
            0.08,
            0.65
        );


        vec3 iridescent;

        if (rainbow < 0.33) {

            iridescent = mix(
                cyan,
                blue,
                rainbow / 0.33
            );

        } else if (rainbow < 0.66) {

            iridescent = mix(
                blue,
                violet,
                (rainbow - 0.33) / 0.33
            );

        } else {

            iridescent = mix(
                violet,
                magenta,
                (rainbow - 0.66) / 0.34
            );
        }


        // ---------------------------------------------------------
        // EDGE COATING
        // ---------------------------------------------------------

        float edgeColorStrength =
            0.25 + fresnel * 0.95;

        vec3 edgeColor =
            mix(
                uLensColor,
                iridescent,
                edgeColorStrength
            );


        // ---------------------------------------------------------
        // MOVING SPECULAR REFLECTION
        // ---------------------------------------------------------

        float reflectionAngle =
            c.x * 2.4
            + c.y * 1.15
            + sin(uTime * 0.55) * 1.5;


        float reflectionBand =
            exp(
                -pow(
                    reflectionAngle * 3.0,
                    2.0
                )
            );


        // Thin secondary reflection
        float reflectionBand2 =
            exp(
                -pow(
                    (
                        c.x * 3.0
                        - c.y * 1.4
                        - sin(uTime * 0.8) * 1.8
                    ) * 5.0,
                    2.0
                )
            );


        // ---------------------------------------------------------
        // BROAD GLASS HIGHLIGHT
        // ---------------------------------------------------------

        float broadHighlight =
            smoothstep(
                0.55,
                0.0,
                abs(
                    c.x
                    + c.y * 0.65
                    + sin(uTime * 0.35) * 0.25
                )
            );

        broadHighlight *= 0.18;


        // ---------------------------------------------------------
        // CENTRAL GLASS TINT
        // Keep the cockpit visible underneath
        // ---------------------------------------------------------

        vec3 baseGlass =
            mix(
                uLensColor * 0.12,
                vec3(0.015, 0.08, 0.13),
                0.72
            );


        // Slight blue atmospheric tint
        baseGlass += vec3(
            0.00,
            0.025,
            0.045
        );


        // ---------------------------------------------------------
        // COMBINE REFLECTIONS
        // ---------------------------------------------------------

        vec3 color = baseGlass;

        // Iridescent coating mostly toward the edges
        color = mix(
            color,
            edgeColor,
            fresnel * 0.72
        );

        // Main reflected streak
        color +=
            iridescent
            * reflectionBand
            * 0.65;

        // Secondary sharp reflection
        color +=
            vec3(0.65, 0.90, 1.0)
            * reflectionBand2
            * 0.42;

        // Soft white/cyan reflection
        color +=
            vec3(0.55, 0.95, 1.0)
            * broadHighlight;


        // ---------------------------------------------------------
        // THIN EDGE LIGHT
        // ---------------------------------------------------------

        float rim =
            smoothstep(
                0.34,
                0.50,
                dist
            );

        color +=
            iridescent
            * rim
            * 0.75;


        // ---------------------------------------------------------
        // GLASS DEPTH / TRANSPARENCY
        // ---------------------------------------------------------

        float centerTransparency =
            0.34;

        float edgeOpacity =
            fresnel * 0.52;

        float reflectionOpacity =
            reflectionBand * 0.20
            + reflectionBand2 * 0.14;

        float alpha =
            glassMask
            * (
                centerTransparency
                + edgeOpacity
                + reflectionOpacity
            );

        alpha = clamp(alpha, 0.0, 0.82);


        gl_FragColor =
            vec4(color, alpha);
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
                depthWrite={false}
                blending={THREE.AdditiveBlending}
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

function buildPropellerBladeShape(radius, bladeWidth, hubScale = 1) {
    const shape = new THREE.Shape()
    const hubR = radius * 0.18 * hubScale
    const halfW = bladeWidth / 3.5

    shape.moveTo(-halfW * 0.4, hubR)
    shape.quadraticCurveTo(-halfW, hubR + radius * 0.35, -halfW * 0.55, hubR + radius * 0.85)
    shape.quadraticCurveTo(-halfW * 0.2, hubR + radius, 0, hubR + radius)
    shape.quadraticCurveTo(halfW * 0.2, hubR + radius, halfW * 0.55, hubR + radius * 0.85)
    shape.quadraticCurveTo(halfW, hubR + radius * 0.35, halfW * 0.4, hubR)
    shape.closePath()
    return shape
}

function buildHubShape(radius, hubScale = 1) {
    const shape = new THREE.Shape()
    shape.absarc(0, 0, radius * 0.18 * hubScale, 0, Math.PI * 2, false)
    return shape
}

function PropellerFan({ mount, shipSize }) {
    const spinRef = useRef()

    const radius = mount.radius ?? 0.22
    const bladeCount = mount.bladeCount ?? 3
    const bladeColor = mount.bladeColor ?? '#5f5f5f'
    const hubColor = mount.hubColor ?? '#111111'
    const spinSpeed = (mount.spinSpeed ?? 10) * (mount.direction ?? 1)
    const hubScale = mount.hubScale ?? 1

    const worldRadius = radius * shipSize
    const offsetX = (mount.offsetX ?? 0) * (shipSize / 2)
    const offsetY = (mount.offsetY ?? 0) * (shipSize / 2)

    const bladeGeometry = useMemo(
        () => new THREE.ShapeGeometry(buildPropellerBladeShape(worldRadius, worldRadius * 0.32, hubScale)),
        [worldRadius, hubScale]
    )
    const hubGeometry = useMemo(
        () => new THREE.ShapeGeometry(buildHubShape(worldRadius, hubScale)),
        [worldRadius, hubScale]
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

        float d = length(vec2(c.x * 3.4, c.y * 1.05));
        float mask = smoothstep(1.0, 0.55, d);
        if (mask <= 0.001) discard;

        float flicker = 0.55 + 0.45 * sin(uTime * uSpeed * 6.0);

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