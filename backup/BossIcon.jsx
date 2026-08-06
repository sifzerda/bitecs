import React from 'react'

function mirrorPoints(points) {
    return points.map(([x, y]) => [-x, y])
}

function polygonPoints(points) {
    return points.map(([x, y]) => `${x},${-y}`).join(' ')
}

function shapeStyle(part, fallback = '#cfe8ff') {
    return {
        fill: part?.color ?? fallback,
        stroke: 'rgba(255,255,255,0.12)',
        strokeWidth: 0.012,
        strokeLinejoin: 'round',
        strokeLinecap: 'round',
    }
}

function Fuselage({ cfg }) {
    const p = cfg.fuselage

    const points = [
        [0, p.tipY],
        [p.shoulderWidth, p.shoulderY],
        [p.waistWidth, p.waistY],
        [p.tailWidth, p.tailY],
        [p.tailWidth * 0.35, p.notchY],
        [0, p.tailY + 0.08],
        [-p.tailWidth * 0.35, p.notchY],
        [-p.tailWidth, p.tailY],
        [-p.waistWidth, p.waistY],
        [-p.shoulderWidth, p.shoulderY],
    ]

    return (
        <polygon
            points={polygonPoints(points)}
            style={shapeStyle(p)}
        />
    )
}

function CockpitGlass({ cfg }) {
    const p = cfg.cockpitGlass

    if (!p?.enabled) return null

    const points = [
        [0, cfg.cockpit.topY],
        [cfg.cockpit.topWidth, cfg.cockpit.topY - 0.06],
        [cfg.cockpit.midWidth, cfg.cockpit.midY],
        [cfg.cockpit.bottomWidth, cfg.cockpit.bottomY],
        [-cfg.cockpit.bottomWidth, cfg.cockpit.bottomY],
        [-cfg.cockpit.midWidth, cfg.cockpit.midY],
        [-cfg.cockpit.topWidth, cfg.cockpit.topY - 0.06],
    ]

    return (
        <>
            <defs>

                {/* ================================================= */}
                {/* OIL-SLICK IRIDESCENCE */}
                {/* ================================================= */}

                <linearGradient
                    id="cockpitIridescence"
                    x1="-100%"
                    y1="100%"
                    x2="200%"
                    y2="0%"
                >
                    <stop offset="0%" stopColor="#001bff">
                        <animate
                            attributeName="stop-color"
                            values="
                                #001bff;
                                #00eaff;
                                #763cff;
                                #ff35c9;
                                #0066ff;
                                #001bff
                            "
                            dur="7s"
                            repeatCount="indefinite"
                        />
                    </stop>

                    <stop offset="22%" stopColor="#00dfff">
                        <animate
                            attributeName="stop-color"
                            values="
                                #00dfff;
                                #763cff;
                                #ff35c9;
                                #00ffff;
                                #00dfff
                            "
                            dur="8s"
                            repeatCount="indefinite"
                        />
                    </stop>

                    <stop offset="42%" stopColor="#8a42ff">
                        <animate
                            attributeName="stop-color"
                            values="
                                #8a42ff;
                                #ff42d0;
                                #00ffff;
                                #315cff;
                                #8a42ff
                            "
                            dur="6s"
                            repeatCount="indefinite"
                        />
                    </stop>

                    <stop offset="57%" stopColor="#ff45d7">
                        <animate
                            attributeName="stop-color"
                            values="
                                #ff45d7;
                                #00ffff;
                                #4265ff;
                                #ff45d7
                            "
                            dur="9s"
                            repeatCount="indefinite"
                        />
                    </stop>

                    <stop offset="75%" stopColor="#00cfff">
                        <animate
                            attributeName="stop-color"
                            values="
                                #00cfff;
                                #3261ff;
                                #ff38d1;
                                #00cfff
                            "
                            dur="7.5s"
                            repeatCount="indefinite"
                        />
                    </stop>

                    <stop offset="100%" stopColor="#d9ffff">
                        <animate
                            attributeName="stop-color"
                            values="
                                #d9ffff;
                                #4fdcff;
                                #c8a0ff;
                                #d9ffff
                            "
                            dur="10s"
                            repeatCount="indefinite"
                        />
                    </stop>
                </linearGradient>


                {/* ================================================= */}
                {/* MOVING SPECULAR BAND */}
                {/* ================================================= */}

                <linearGradient
                    id="cockpitSpecular"
                    x1="-100%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                >
                    <stop
                        offset="0%"
                        stopColor="#ffffff"
                        stopOpacity="0"
                    />

                    <stop
                        offset="42%"
                        stopColor="#ffffff"
                        stopOpacity="0"
                    />

                    <stop
                        offset="50%"
                        stopColor="#ffffff"
                        stopOpacity="0.72"
                    />

                    <stop
                        offset="58%"
                        stopColor="#ffffff"
                        stopOpacity="0"
                    />

                    <stop
                        offset="100%"
                        stopColor="#ffffff"
                        stopOpacity="0"
                    />

                    <animateTransform
                        attributeName="gradientTransform"
                        type="translate"
                        from="-1 0"
                        to="1 0"
                        dur="4.5s"
                        repeatCount="indefinite"
                    />
                </linearGradient>


                {/* ================================================= */}
                {/* GLASS DEPTH */}
                {/* ================================================= */}

                <linearGradient
                    id="cockpitDepth"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                >
                    <stop
                        offset="0%"
                        stopColor="#ffffff"
                        stopOpacity="0.42"
                    />

                    <stop
                        offset="30%"
                        stopColor="#ffffff"
                        stopOpacity="0.08"
                    />

                    <stop
                        offset="65%"
                        stopColor="#001b55"
                        stopOpacity="0.05"
                    />

                    <stop
                        offset="100%"
                        stopColor="#00052c"
                        stopOpacity="0.42"
                    />
                </linearGradient>


                {/* ================================================= */}
                {/* EDGE GLOW */}
                {/* ================================================= */}

                <linearGradient
                    id="cockpitEdge"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                >
                    <stop
                        offset="0%"
                        stopColor="#ffffff"
                        stopOpacity="0.85"
                    />

                    <stop
                        offset="30%"
                        stopColor="#00eaff"
                        stopOpacity="0.7"
                    />

                    <stop
                        offset="55%"
                        stopColor="#b74cff"
                        stopOpacity="0.75"
                    />

                    <stop
                        offset="80%"
                        stopColor="#ff49d7"
                        stopOpacity="0.65"
                    />

                    <stop
                        offset="100%"
                        stopColor="#00eaff"
                        stopOpacity="0.8"
                    />
                </linearGradient>

            </defs>


            {/* ================================================= */}
            {/* BASE IRIDESCENT GLASS */}
            {/* ================================================= */}

            <polygon
                points={polygonPoints(points)}
                fill="url(#cockpitIridescence)"
                opacity="0.92"
            />


            {/* ================================================= */}
            {/* MOVING LIGHT REFLECTION */}
            {/* ================================================= */}

            <polygon
                points={polygonPoints(points)}
                fill="url(#cockpitSpecular)"
                opacity="0.65"
            />


            {/* ================================================= */}
            {/* GLASS CURVATURE / DEPTH */}
            {/* ================================================= */}

            <polygon
                points={polygonPoints(points)}
                fill="url(#cockpitDepth)"
                opacity="0.55"
            />


            {/* ================================================= */}
            {/* GLASS EDGE */}
            {/* ================================================= */}

            <polygon
                points={polygonPoints(points)}
                fill="none"
                stroke="url(#cockpitEdge)"
                strokeWidth="0.025"
                strokeLinejoin="round"
                opacity="0.9"
            />


            {/* ================================================= */}
            {/* SMALL GLASS HIGHLIGHT */}
            {/* ================================================= */}

            <path
                d={`
                    M ${-cfg.cockpit.topWidth * 0.5}
                      ${-(cfg.cockpit.topY - 0.04)}

                    L ${cfg.cockpit.midWidth * 0.35}
                      ${-(cfg.cockpit.midY + 0.04)}
                `}
                fill="none"
                stroke="#ffffff"
                strokeWidth="0.018"
                strokeLinecap="round"
                opacity="0.65"
            />

        </>
    )
}

function Cockpit({ cfg }) {
    const p = cfg.cockpit

    const points = [
        [0, p.topY],
        [p.topWidth, p.topY - 0.06],
        [p.midWidth, p.midY],
        [p.bottomWidth, p.bottomY],
        [-p.bottomWidth, p.bottomY],
        [-p.midWidth, p.midY],
        [-p.topWidth, p.topY - 0.06],
    ]

    return (
        <polygon
            points={polygonPoints(points)}
            style={{
                ...shapeStyle(p),
                fill: p.color,
            }}
        />
    )
}

function Wing({ cfg, side = 1 }) {
    const p = cfg.wing

    const points = [
        [p.rootX, p.rootY],
        [p.tipX, p.tipY],
        [p.trailX, p.trailY],
        [p.innerX, p.innerY],
    ]

    const mirrored = points.map(([x, y]) => [x * side, y])

    return (
        <polygon
            points={polygonPoints(mirrored)}
            style={shapeStyle(p)}
        />
    )
}

function WingPanel({ cfg, side = 1 }) {
    const p = cfg.wing
    const inset = cfg.wingPanel?.inset ?? 0.08

    const cx =
        (p.rootX + p.tipX + p.trailX + p.innerX) / 4

    const cy =
        (p.rootY + p.tipY + p.trailY + p.innerY) / 4

    const shrink = (x, y) => {
        const dx = x - cx
        const dy = y - cy
        const len = Math.hypot(dx, dy) || 1
        const factor = Math.max(0, 1 - inset / len)

        return [
            cx + dx * factor,
            cy + dy * factor,
        ]
    }

    const points = [
        shrink(p.rootX, p.rootY),
        shrink(p.tipX, p.tipY),
        shrink(p.trailX, p.trailY),
        shrink(p.innerX, p.innerY),
    ].map(([x, y]) => [x * side, y])

    return (
        <polygon
            points={polygonPoints(points)}
            style={{
                ...shapeStyle(cfg.wingPanel),
                stroke: 'none',
            }}
        />
    )
}

function Wingtip({ cfg, side = 1 }) {
    const p = cfg.wingtip

    if (!p || p.width === 0 || p.height === 0) {
        return null
    }

    return (
        <rect
            x={side * p.offsetX - p.width / 2}
            y={-(p.offsetY + p.height / 2)}
            width={p.width}
            height={p.height}
            rx={p.width * 0.15}
            style={{
                fill: p.color,
            }}
        />
    )
}

// Mirrors offsetX and flips tiltDeg per side, matching MirroredPair's
// flipZAngle behavior in the 3D renderer (BossRenderer.jsx renders
// both racingStripe and decal via MirroredPair, so the icon has to
// draw both sides too — see the two calls per part in BossIcon below).
function Stripe({ cfg, part, side = 1 }) {
    if (!part?.enabled) return null

    const width = part.width
    const length = part.length
    const offsetX = part.offsetX * side
    const tilt = (part.tiltDeg ?? 0) * side

    return (
        <rect
            x={offsetX - width / 2}
            y={-(part.offsetY + length / 2)}
            width={width}
            height={length}
            rx={width * 0.25}
            transform={`rotate(${-tilt} ${offsetX} ${-part.offsetY})`}
            style={{
                fill: part.color,
            }}
        />
    )
}

// NOTE: render this AFTER <CockpitGlass/> in BossIcon's return. Previously
// it rendered before the glass, and the glass's near-opaque animated fill
// covered the wide base of the spike, leaving only a near-invisible sliver
// of the tapering tip poking out above it (this is why the default "Player"
// entry appeared to have no nose spike at all).
function NoseSpike({ cfg }) {
    const p = cfg.noseSpike

    if (!p?.enabled) return null

    const halfW = p.width / 2

    return (
        <polygon
            points={polygonPoints([
                [0, cfg.fuselage.tipY + p.offsetY + p.length],
                [halfW, cfg.fuselage.tipY + p.offsetY],
                [-halfW, cfg.fuselage.tipY + p.offsetY],
            ])}
            style={{
                fill: p.color,
            }}
        />
    )
}

function TailFin({ cfg, side = 1 }) {
    const p = cfg.tailFin

    if (!p?.enabled) return null

    const halfW = p.width / 2
    const halfL = p.length / 2

    const points = [
        [0, halfL],
        [halfW * 0.35, halfL * 0.35],
        [halfW, -halfL + p.sweep],
        [halfW * 0.25, -halfL - p.sweep * 0.4],
        [-halfW * 0.2, -halfL],
    ].map(([x, y]) => [
        x * side + p.offsetX * side,
        y + p.offsetY,
    ])

    return (
        <polygon
            points={polygonPoints(points)}
            style={{
                fill: p.color,
            }}
        />
    )
}

function EngineIntake({ cfg, side = 1 }) {
    const p = cfg.engineIntake

    if (!p?.enabled) return null

    const halfW = p.width / 2

    const points = [
        [-halfW, 0],
        [halfW, 0],
        [halfW * 0.55, -p.height],
        [-halfW * 0.55, -p.height],
    ].map(([x, y]) => [
        x + p.offsetX * side,
        y + p.offsetY,
    ])

    return (
        <polygon
            points={polygonPoints(points)}
            style={{
                fill: p.color,
            }}
        />
    )
}

function HullVents({ cfg, side = 1 }) {
    const p = cfg.hullVent

    if (!p?.enabled) return null

    const total = (p.count - 1) * p.spacing

    return (
        <>
            {Array.from({ length: p.count }, (_, i) => {
                const y =
                    -total / 2 +
                    i * p.spacing +
                    p.offsetY

                return (
                    <rect
                        key={i}
                        x={
                            side * p.offsetX -
                            p.width / 2
                        }
                        y={
                            -y -
                            p.height / 2
                        }
                        width={p.width}
                        height={p.height}
                        rx={p.height / 2}
                        style={{
                            fill: p.color,
                        }}
                    />
                )
            })}
        </>
    )
}

// FIX: previously used `p.startY ?? 0`, but tailBoom configs never set
// startY — the 3D renderer injects `startY: fuselage.tailY` when building
// geometry (see buildBossAssets in BossRenderer.jsx). The icon skipped
// that step entirely, so the boom always started at y=0 instead of at
// the fuselage's actual tail.
function TailBoom({ cfg }) {
    const p = cfg.tailBoom

    if (!p?.enabled) return null

    const halfBase = p.baseWidth / 2
    const halfTip = p.tipWidth / 2

    const startY = cfg.fuselage.tailY
    const endY = startY - p.length

    return (
        <polygon
            points={polygonPoints([
                [-halfBase, startY],
                [halfBase, startY],
                [halfTip, endY],
                [-halfTip, endY],
            ])}
            style={{
                fill: p.color,
            }}
        />
    )
}

// FIX: previously positioned using only `p.offsetY`, ignoring the tail
// boom entirely. The 3D renderer computes
// `boomFinY = fuselage.tailY - tailBoom.length` and adds offsetY on top
// (see `geo.boomFinY` in BossRenderer.jsx). Without that, the fin landed
// near the ship's center — and since BoomFin paints *before* Fuselage,
// the opaque fuselage polygon painted right over it, making it invisible
// (Rambo's `tailBoom.length: 1.38` made this especially obvious).
function BoomFin({ cfg, side = 1 }) {
    const p = cfg.boomFin

    if (!p?.enabled) return null

    const halfW = p.width / 2
    const halfL = p.length / 2
    const boomFinY = cfg.fuselage.tailY - cfg.tailBoom.length + p.offsetY

    const points = [
        [0, halfL],
        [halfW * 0.35, halfL * 0.35],
        [halfW, -halfL + p.sweep],
        [halfW * 0.25, -halfL - p.sweep * 0.4],
        [-halfW * 0.2, -halfL],
    ].map(([x, y]) => [
        x * side + p.offsetX * side,
        y + boomFinY,
    ])

    return (
        <polygon
            points={polygonPoints(points)}
            style={{
                fill: p.color,
            }}
        />
    )
}

function PropellerIcon({
    config,
    position = [0, 0],
    direction = 1,
}) {
    if (!config?.enabled) return null

    const {
        bladeColor = '#ffffff',
        hubColor = '#000000',
        bladeCount = 3,
        bladeLength = 0.15,
        bladeWidth = 0.05,
        hubRadius = 0.03,
        spinSpeed = 6,
    } = config

    const [x, y] = position

    const duration =
        Math.max(
            0.08,
            (Math.PI * 2) / Math.abs(spinSpeed || 1)
        )

    const bladePath = `
        M ${-bladeWidth * 0.4} ${-hubRadius}
        Q ${-bladeWidth} ${-(hubRadius + bladeLength * 0.35)}
          ${-bladeWidth * 0.55} ${-(hubRadius + bladeLength * 0.85)}
        Q ${-bladeWidth * 0.2} ${-(hubRadius + bladeLength)}
          0 ${-(hubRadius + bladeLength)}
        Q ${bladeWidth * 0.2} ${-(hubRadius + bladeLength)}
          ${bladeWidth * 0.55} ${-(hubRadius + bladeLength * 0.85)}
        Q ${bladeWidth} ${-(hubRadius + bladeLength * 0.35)}
          ${bladeWidth * 0.4} ${-hubRadius}
        Z
    `

    return (
        <g
            transform={`translate(${x} ${-y})`}
            className="boss-propeller"
        >
            <style>
                {`
                    @keyframes bossPropellerSpin {
                        from {
                            transform: rotate(0deg);
                        }
                        to {
                            transform: rotate(${direction * 360}deg);
                        }
                    }

                    .boss-propeller-spin {
                        transform-box: fill-box;
                        transform-origin: center;
                        animation-name: bossPropellerSpin;
                        animation-duration: ${duration}s;
                        animation-timing-function: linear;
                        animation-iteration-count: infinite;
                    }
                `}
            </style>

            <g className="boss-propeller-spin">

                {Array.from(
                    { length: bladeCount },
                    (_, i) => {

                        const angle =
                            (360 / bladeCount) * i

                        return (
                            <path
                                key={i}
                                d={bladePath}
                                transform={`rotate(${angle})`}
                                fill={bladeColor}
                                stroke="rgba(255,255,255,0.15)"
                                strokeWidth="0.008"
                            />
                        )
                    }
                )}

                <circle
                    cx="0"
                    cy="0"
                    r={hubRadius}
                    fill={hubColor}
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="0.008"
                />

            </g>
        </g>
    )
}

export default function BossIcon({
    config,
    className = '',
}) {
    if (!config) return null

    return (
        <svg
            className={className}
            viewBox="-3 -3 6 6"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid meet"
            overflow="visible"
        >
            <g>

                {/* Wings behind the fuselage */}
                <Wing cfg={config} side={1} />
                <Wing cfg={config} side={-1} />

                {/* Wing panels */}
                <WingPanel cfg={config} side={1} />
                <WingPanel cfg={config} side={-1} />

                {/* Wing tips */}
                <Wingtip cfg={config} side={1} />
                <Wingtip cfg={config} side={-1} />

                {/* Tail booms */}
                <TailBoom cfg={config} />

                {/* Boom fins */}
                <BoomFin cfg={config} side={1} />
                <BoomFin cfg={config} side={-1} />

                {/* Tail fins */}
                <TailFin cfg={config} side={1} />
                <TailFin cfg={config} side={-1} />

                {/* Engine intakes */}
                <EngineIntake cfg={config} side={1} />
                <EngineIntake cfg={config} side={-1} />

                {/* Hull vents */}
                <HullVents cfg={config} side={1} />
                <HullVents cfg={config} side={-1} />

                {/* Main body */}
                <Fuselage cfg={config} />

                {/* Cockpit */}
                <Cockpit cfg={config} />

                {/* Racing stripes — both sides, matching BossRenderer's MirroredPair */}
                <Stripe cfg={config} part={config.racingStripe} side={1} />
                <Stripe cfg={config} part={config.racingStripe} side={-1} />

                {/* Decal — both sides, matching BossRenderer's MirroredPair */}
                <Stripe cfg={config} part={config.decal} side={1} />
                <Stripe cfg={config} part={config.decal} side={-1} />

                {/* Cockpit glass overlay — must render before NoseSpike, not after,
                    or the glass paints over the spike's base (see NoseSpike note above) */}
                <CockpitGlass cfg={config} />

                {/* Nose — rendered last so it sits on top of the cockpit glass */}
                <NoseSpike cfg={config} />

            </g>

            {/* ========================================================= */}
            {/* ANIMATED PROPELLERS                                      */}
            {/* ========================================================= */}

            {config.propeller?.enabled && (
                <>
                    <PropellerIcon
                        config={config.propeller}
                        position={[
                            config.propeller.offsetX,
                            config.propeller.offsetY,
                        ]}
                        direction={1}
                    />

                    <PropellerIcon
                        config={config.propeller}
                        position={[
                            -config.propeller.offsetX,
                            config.propeller.offsetY,
                        ]}
                        direction={-1}
                    />
                </>
            )}

            {config.centerPropeller?.enabled && (
                <PropellerIcon
                    config={config.centerPropeller}
                    position={[
                        0,
                        config.centerPropeller.offsetY,
                    ]}
                    direction={1}
                />
            )}

        </svg>
    )
}