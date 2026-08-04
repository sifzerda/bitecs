// src/components/GunIcon.jsx

const SCALE = 140
const CX = 170
const CY = 110

const pt = (x, y) => `${(CX + x * SCALE).toFixed(1)},${(CY - y * SCALE).toFixed(1)}`
const pathOf = (pts) => `M ${pts.map(([x, y]) => pt(x, y)).join(' L ')} Z`

// ---- shape builders (2D ports of GunRenderer.jsx's Three.js shape builders) ----

function frameLocal(cfg) {
    const halfH = cfg.height / 2
    const tailH = halfH * (1 - cfg.taper)
    return [
        [0, halfH], [cfg.length, halfH * 0.7], [cfg.length, -halfH * 0.7],
        [0, -halfH], [-cfg.length * 0.25, -tailH], [-cfg.length * 0.25, tailH],
    ].map(([x, y]) => [x + cfg.offsetX, y + cfg.offsetY])
}

function blockLocal(length, width, ox = 0, oy = 0) {
    const hL = length / 2, hW = width / 2
    return [[-hL, hW], [hL, hW], [hL, -hW], [-hL, -hW]].map(([x, y]) => [x + ox, y + oy])
}

function muzzleLocal(barrel, muzzle) {
    const hW = muzzle.width / 2
    const ox = barrel.offsetX + barrel.length / 2 + (muzzle.offsetX ?? 0)
    const oy = barrel.offsetY + (muzzle.offsetY ?? 0)
    return [
        [0, hW], [muzzle.length, hW * 0.6], [muzzle.length, -hW * 0.6], [0, -hW],
    ].map(([x, y]) => [x + ox, y + oy])
}

// canister renders as a native SVG rounded-rect (equivalent to the capsule
// arc shape in buildCanisterShape, without replicating the arc math)
function canisterRect(cfg) {
    const hL = cfg.length / 2, hW = cfg.width / 2
    const x = CX + (cfg.offsetX - hL) * SCALE
    const y = CY - (cfg.offsetY + hW) * SCALE
    return {
        x, y,
        width: cfg.length * SCALE,
        height: cfg.width * SCALE,
        rx: Math.min(hL, hW) * SCALE,
    }
}

export default function GunIcon({ config, animated = false, className = '' }) {
    const { frame, slide, barrel, muzzle, mountBracket, sight, accentStripe, coreGlow, canister } = config
    const frameHalfH = frame.height / 2

    // muzzle tip in world space, used for the flash/bullet overlay
    const tipX = barrel.enabled
        ? barrel.offsetX + barrel.length / 2 + (muzzle.enabled ? (muzzle.offsetX ?? 0) + muzzle.length : 0)
        : frame.offsetX + frame.length
    const tipY = barrel.offsetY + (muzzle.enabled ? (muzzle.offsetY ?? 0) : 0)
    const [tsx, tsy] = [CX + tipX * SCALE, CY - tipY * SCALE]

    return (
        <svg viewBox="0 0 420 220" className={className}>
            {/* mountBracket — furthest back, GunRenderer pins it to [0,0] regardless of its offsetX/Y */}
            {mountBracket.enabled && (
                <polygon points={blockLocal(mountBracket.length, mountBracket.width).map(([x, y]) => pt(x, y)).join(' ')}
                    fill={mountBracket.color} opacity="0.9" />
            )}

            {/* frame */}
            <path d={pathOf(frameLocal(frame))} fill={frame.color} stroke="#000" strokeOpacity="0.25" strokeWidth="1" />

            {/* barrel */}
            {barrel.enabled && (
                <polygon points={blockLocal(barrel.length, barrel.width, barrel.offsetX, barrel.offsetY).map(([x, y]) => pt(x, y)).join(' ')}
                    fill={barrel.color} />
            )}

            {/* canister */}
            {canister.enabled && (() => {
                const r = canisterRect(canister)
                return <rect {...r} fill={canister.color} opacity={canister.transmission > 0 ? 0.55 : 1} />
            })()}

            {/* muzzle */}
            {muzzle.enabled && (
                <path d={pathOf(muzzleLocal(barrel, muzzle))} fill={muzzle.color} />
            )}

            {/* slide */}
            {slide.enabled && (
                <polygon points={blockLocal(slide.length, slide.height, slide.offsetX, slide.offsetY).map(([x, y]) => pt(x, y)).join(' ')}
                    fill={slide.color} opacity="0.95" />
            )}

            {/* sight */}
            {sight.enabled && (
                <polygon points={blockLocal(sight.width, sight.height, sight.offsetX, frameHalfH + 0.02).map(([x, y]) => pt(x, y)).join(' ')}
                    fill={sight.color} />
            )}

            {/* accent stripe */}
            {accentStripe.enabled && (
                <polygon points={blockLocal(accentStripe.length, accentStripe.width, 0, accentStripe.offsetY).map(([x, y]) => pt(x, y)).join(' ')}
                    fill={accentStripe.color} opacity="0.85" />
            )}

            {/* core glow — frontmost */}
            {coreGlow.enabled && (
                <circle
                    cx={CX + coreGlow.offsetX * SCALE}
                    cy={CY - (coreGlow.offsetY ?? 0) * SCALE}
                    r={((coreGlow.width ?? coreGlow.size) / 2) * SCALE}
                    fill={coreGlow.color}
                    opacity={Math.min(coreGlow.intensity / 2, 0.9)}
                    style={{ filter: `blur(3px)` }}
                />
            )}

            {/* optional firing loop, anchored to this gun's actual muzzle tip */}
            {animated && (
                <>
                    <g className="animate-muzzle-flash" style={{ transformOrigin: `${tsx}px ${tsy}px` }}>
                        <polygon points={`${tsx},${tsy} ${tsx + 16},${tsy - 7} ${tsx + 10},${tsy} ${tsx + 16},${tsy + 7}`} fill="#67e8f9" />
                        <circle cx={tsx + 2} cy={tsy} r="5" fill="#e0fbff" />
                    </g>
                    <rect
                        x={tsx + 2} y={tsy - 2.5} width="10" height="5" rx="2.5"
                        fill="#e0fbff"
                        className="animate-bullet-fire"
                        style={{ filter: 'drop-shadow(0 0 4px #22d3ee)' }}
                    />
                </>
            )}
        </svg>
    )
}