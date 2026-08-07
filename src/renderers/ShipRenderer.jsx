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

    // Overall canopy size
    width: 0.065,
    height: 0.10,

    // Glass
    lensColor: '#00eaff',

    // Structural canopy frame
    frameColor: '#07131c',
    edgeThickness: 0.075,
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
    uniform vec3 uFrameColor;
    uniform float uEdgeThickness;

    varying vec2 vUv;


    // ============================================================
    // DISTANCE TO LINE SEGMENT
    // ============================================================

    float sdSegment(vec2 p, vec2 a, vec2 b) {

        vec2 pa = p - a;
        vec2 ba = b - a;

        float h =
            clamp(
                dot(pa, ba) / dot(ba, ba),
                0.0,
                1.0
            );

        return length(pa - ba * h);
    }


    // ============================================================
    // DISTANCE TO CONVEX CANOPY EDGES
    //
    // Shape:
    //
    //              ┌────────┐
    //             /          \\
    //            /            \\
    //           /              \\
    //          │                │
    //          │                │
    //          │                │
    //           \\              /
    //            \\            /
    //             └──────────┘
    //
    // ============================================================

    float canopyOutside(vec2 p) {

        // --------------------------------------------------------
        // OUTER CANOPY VERTICES
        // --------------------------------------------------------

        vec2 topLeft =
            vec2(-0.28, 1.00);

        vec2 topRight =
            vec2(0.28, 1.00);

        vec2 upperRight =
            vec2(0.48, 0.50);

        vec2 lowerRight =
            vec2(0.40, -0.82);

        vec2 bottomRight =
            vec2(0.25, -1.00);

        vec2 bottomLeft =
            vec2(-0.25, -1.00);

        vec2 lowerLeft =
            vec2(-0.40, -0.82);

        vec2 upperLeft =
            vec2(-0.48, 0.50);


        // --------------------------------------------------------
        // CONVEX POLYGON HALF PLANES
        // --------------------------------------------------------

        float e0 =
            cross(
                vec3(topRight - topLeft, 0.0),
                vec3(p - topLeft, 0.0)
            ).z;

        float e1 =
            cross(
                vec3(upperRight - topRight, 0.0),
                vec3(p - topRight, 0.0)
            ).z;

        float e2 =
            cross(
                vec3(lowerRight - upperRight, 0.0),
                vec3(p - upperRight, 0.0)
            ).z;

        float e3 =
            cross(
                vec3(bottomRight - lowerRight, 0.0),
                vec3(p - lowerRight, 0.0)
            ).z;

        float e4 =
            cross(
                vec3(bottomLeft - bottomRight, 0.0),
                vec3(p - bottomRight, 0.0)
            ).z;

        float e5 =
            cross(
                vec3(lowerLeft - bottomLeft, 0.0),
                vec3(p - bottomLeft, 0.0)
            ).z;

        float e6 =
            cross(
                vec3(upperLeft - lowerLeft, 0.0),
                vec3(p - lowerLeft, 0.0)
            ).z;

        float e7 =
            cross(
                vec3(topLeft - upperLeft, 0.0),
                vec3(p - upperLeft, 0.0)
            ).z;


        // Shape is clockwise, so interior is negative
        float outside =
            max(
                max(e0, e1),
                max(
                    max(e2, e3),
                    max(
                        max(e4, e5),
                        max(e6, e7)
                    )
                )
            );

        return outside;
    }


    // ============================================================
    // MAIN
    // ============================================================

    void main() {

        // --------------------------------------------------------
        // UV → CANOPY SPACE
        // --------------------------------------------------------

        vec2 p = vUv - 0.5;

        // Preserve canopy proportions
        p.x *= 2.0;


        // --------------------------------------------------------
        // OUTER SHAPE
        // --------------------------------------------------------

        float outside =
            canopyOutside(p);

        float insideMask =
            1.0 -
            smoothstep(
                0.0,
                0.018,
                outside
            );

        if (insideMask <= 0.001)
            discard;


        // --------------------------------------------------------
        // PANEL VERTICES
        // --------------------------------------------------------

        vec2 topLeft =
            vec2(-0.28, 1.00);

        vec2 topRight =
            vec2(0.28, 1.00);

        vec2 upperRight =
            vec2(0.48, 0.50);

        vec2 lowerRight =
            vec2(0.40, -0.82);

        vec2 bottomRight =
            vec2(0.25, -1.00);

        vec2 bottomLeft =
            vec2(-0.25, -1.00);

        vec2 lowerLeft =
            vec2(-0.40, -0.82);

        vec2 upperLeft =
            vec2(-0.48, 0.50);


        // --------------------------------------------------------
        // PANEL DIVIDERS
        // --------------------------------------------------------

        // Top panel / main cockpit boundary
        vec2 topPanelLeft =
            vec2(-0.28, 0.50);

        vec2 topPanelRight =
            vec2(0.28, 0.50);


        // Left central panel boundary
        vec2 centerLeftBottom =
            vec2(-0.25, -0.82);

        // Right central panel boundary
        vec2 centerRightBottom =
            vec2(0.25, -0.82);


        // Bottom panel boundary
        vec2 bottomPanelLeft =
            vec2(-0.25, -0.82);

        vec2 bottomPanelRight =
            vec2(0.25, -0.82);


        // --------------------------------------------------------
        // FRAME DISTANCES
        // --------------------------------------------------------

        // Outer frame
        float frameTop =
            sdSegment(
                p,
                topLeft,
                topRight
            );

        float frameUpperRight =
            sdSegment(
                p,
                topRight,
                upperRight
            );

        float frameRight =
            sdSegment(
                p,
                upperRight,
                lowerRight
            );

        float frameBottomRight =
            sdSegment(
                p,
                lowerRight,
                bottomRight
            );

        float frameBottom =
            sdSegment(
                p,
                bottomRight,
                bottomLeft
            );

        float frameBottomLeft =
            sdSegment(
                p,
                bottomLeft,
                lowerLeft
            );

        float frameLeft =
            sdSegment(
                p,
                lowerLeft,
                upperLeft
            );

        float frameUpperLeft =
            sdSegment(
                p,
                upperLeft,
                topLeft
            );


        // --------------------------------------------------------
        // INTERNAL PANEL FRAMES
        // --------------------------------------------------------

        // Horizontal line below top panel
        float dividerTop =
            sdSegment(
                p,
                topPanelLeft,
                topPanelRight
            );


        // Left vertical-ish structural frame
        float dividerLeft =
            sdSegment(
                p,
                topPanelLeft,
                centerLeftBottom
            );


        // Right vertical-ish structural frame
        float dividerRight =
            sdSegment(
                p,
                topPanelRight,
                centerRightBottom
            );


        // Bottom panel top edge
        float dividerBottom =
            sdSegment(
                p,
                bottomPanelLeft,
                bottomPanelRight
            );


        // --------------------------------------------------------
        // FIND CLOSEST FRAME
        // --------------------------------------------------------

        float frameDistance =
            min(
                min(
                    min(frameTop, frameUpperRight),
                    min(frameRight, frameBottomRight)
                ),
                min(
                    min(
                        min(frameBottom, frameBottomLeft),
                        min(frameLeft, frameUpperLeft)
                    ),
                    min(
                        min(dividerTop, dividerLeft),
                        min(dividerRight, dividerBottom)
                    )
                )
            );


        // --------------------------------------------------------
        // FRAME MASK
        // --------------------------------------------------------

        float frameMask =
            1.0 -
            smoothstep(
                0.0,
                uEdgeThickness,
                frameDistance
            );


        // --------------------------------------------------------
        // FAKE CURVED GLASS NORMAL
        // --------------------------------------------------------

        vec2 normalXY =
            p * 1.55;

        float radial =
            dot(normalXY, normalXY);

        float normalZ =
            sqrt(
                max(
                    0.001,
                    1.0 - min(radial, 0.90)
                )
            );

        vec3 normal =
            normalize(
                vec3(
                    normalXY.x,
                    normalXY.y,
                    normalZ
                )
            );

        vec3 viewDir =
            vec3(0.0, 0.0, 1.0);


        // --------------------------------------------------------
        // FRESNEL REFLECTION
        // --------------------------------------------------------

        float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
        fresnel = smoothstep(0.02, 0.95, fresnel);

        // --------------------------------------------------------
        // IRIDESCENT COATING
        // --------------------------------------------------------

        float angle = atan(p.y, p.x);
        float rainbow = sin(p.x * 5.0 + p.y * 7.0 + angle * 1.5 - uTime * 0.35);

        rainbow = rainbow * 0.5 + 0.5;

        vec3 cyan = vec3(0.00, 0.90, 1.00);
        vec3 blue = vec3(0.04, 0.30, 1.00);
        vec3 violet = vec3(0.45, 0.08, 1.00);
        vec3 magenta = vec3(1.00, 0.06, 0.55);

        vec3 iridescent;

        if (rainbow < 0.33) {

            iridescent = mix(cyan, blue, rainbow / 0.33);

        } else if (rainbow < 0.66) {

            iridescent = mix(blue, violet, (rainbow - 0.33) / 0.33);

        } else {
            iridescent = mix(violet, magenta, (rainbow - 0.66) / 0.34);
        }

        // --------------------------------------------------------
        // DARK GLASS BASE
        // --------------------------------------------------------

        vec3 glassColor = vec3(0.008, 0.035, 0.055);
        glassColor = mix(glassColor, uLensColor * 0.35, 0.18);

        // --------------------------------------------------------
        // FRESNEL IRIDESCENCE
        // --------------------------------------------------------

        glassColor = mix(glassColor, iridescent, fresnel * 0.72);

        // --------------------------------------------------------
        // SWEEPING REFLECTION
        // --------------------------------------------------------

        float sweep = p.x * 1.1 + p.y * 0.70 - sin(uTime * 0.38) * 0.9;
        float sweepBand = exp(-pow(sweep * 5.0, 2.0));
        float sweepGlow = exp(-pow(sweep * 1.7, 2.0));
        vec3 reflectionColor = vec3(0.65, 0.92, 1.00);
        glassColor += reflectionColor * sweepBand * 0.95;
        glassColor += reflectionColor * sweepGlow * 0.10;

        // --------------------------------------------------------
        // SECONDARY RAINBOW REFLECTION
        // --------------------------------------------------------

        float secondary = p.x * 2.5 - p.y * 1.1 + sin(uTime * 0.55) * 1.3;
        float secondaryBand = exp(-pow(secondary * 6.0, 2.0));
        glassColor += iridescent * secondaryBand * 0.38;

        // --------------------------------------------------------
        // EDGE GLOW
        // --------------------------------------------------------

        float outerRim = smoothstep(0.065, 0.0, abs(outside));
        glassColor += iridescent * outerRim * 0.35;

        // --------------------------------------------------------
        // FRAME
        // --------------------------------------------------------

        vec3 frame = uFrameColor;
        frame += iridescent * fresnel * 0.12;
        glassColor = mix(glassColor, frame, frameMask);

        // --------------------------------------------------------
        // GLASS OPACITY
        // --------------------------------------------------------

        float glassAlpha = 0.38 + fresnel * 0.35 + sweepBand * 0.18;
        float alpha = mix(glassAlpha, 0.96, frameMask);
        alpha *= insideMask;
        alpha = clamp(alpha, 0.0, 0.96);

        gl_FragColor = vec4(glassColor, alpha);
    }
`

function CockpitGlassOverlay({ cfg, shipSize }) {

    const materialRef = useRef(null)

    const uniforms = useRef({
        uTime: { value: 0 },

        uLensColor: {
            value: new THREE.Color(cfg?.lensColor ?? '#00eaff')
        },

        uFrameColor: {
            value: new THREE.Color(cfg?.frameColor ?? '#07131c')
        },

        uEdgeThickness: {
            value: cfg?.edgeThickness ?? 0.075
        }
    })


    useEffect(() => {

        if (cfg?.lensColor) {
            uniforms.current.uLensColor.value.set(cfg.lensColor)
        }

        if (cfg?.frameColor) {
            uniforms.current.uFrameColor.value.set(cfg.frameColor)
        }

        if (cfg?.edgeThickness !== undefined) {
            uniforms.current.uEdgeThickness.value = cfg.edgeThickness
        }

    }, [cfg?.lensColor, cfg?.frameColor, cfg?.edgeThickness]
    )

    useFrame((state) => {

        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
        }
    })


    if (!cfg)
        return null

    const width = (cfg.width ?? 0.065) * shipSize
    const height = (cfg.height ?? 0.10) * shipSize
    const offsetX = (cfg.offsetX ?? 0) * (shipSize / 2)
    const offsetY = (cfg.offsetY ?? 0.137) * (shipSize / 2)

    return (
        <mesh
            position={[offsetX, offsetY, 0.005]}
            renderOrder={RENDER_ORDER.cockpitGlass}>

            <planeGeometry args={[width, height]} />

            <shaderMaterial
                ref={materialRef}
                vertexShader={GLASS_VERTEX_SHADER}
                fragmentShader={GLASS_FRAGMENT_SHADER}
                uniforms={uniforms.current}
                transparent
                depthTest={false}
                depthWrite={false}
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
    <group position={[offsetX, offsetY, 0.008]}>
        <group ref={spinRef}>
            {bladeAngles.map((angle, i) => (
                <mesh
                    key={i}
                    geometry={bladeGeometry}
                    rotation={[0, 0, angle]}
                    renderOrder={RENDER_ORDER.propeller}
                >
                    <meshBasicMaterial
                        color={bladeColor}
                        side={THREE.DoubleSide}
                        transparent
                        depthTest={false}
                        depthWrite={false}
                        toneMapped={false}
                    />
                </mesh>
            ))}

            <mesh
                geometry={hubGeometry}
                renderOrder={RENDER_ORDER.propeller}
            >
                <meshBasicMaterial
                    color={hubColor}
                    side={THREE.DoubleSide}
                    transparent
                    depthTest={false}
                    depthWrite={false}
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
    <mesh
        position={[offsetX, offsetY, 0.008]}
        renderOrder={RENDER_ORDER.propeller}
    >
        <planeGeometry args={[width, height]} />

        <shaderMaterial
            ref={materialRef}
            vertexShader={PROP_BLUR_VERTEX_SHADER}
            fragmentShader={PROP_BLUR_FRAGMENT_SHADER}
            uniforms={uniforms.current}
            transparent
            depthTest={false}
            depthWrite={false}
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