//src/state/arcState.js

// Transient jagged-lightning segments pushed by chain-lightning effects
// (laserSystem's arc gun beam, weaponEffects' chainLightning). Each entry
// is a short-lived polyline that fades out over `life`.

export const arcState = {
    arcs: [], // { points: [{x,y}...], life, maxLife, color }
}

const DEFAULT_COLOR = "#1F51FF"
const JITTER_SEGMENTS = 5     // how many sub-segments each consecutive pair is split into
const JITTER_AMOUNT = 0.12    // max perpendicular offset per subdivision, in world units

// points: array of {x,y} anchor points the chain passes through (in order)
// duration: seconds this arc stays visible before being removed
// color: optional hex string override
export function pushArc(points, duration = 0.12, color = DEFAULT_COLOR) {

    if (!points || points.length < 2) return

    const jagged = [points[0]]

    for (let i = 0; i < points.length - 1; i++) {

        const a = points[i]
        const b = points[i + 1]

        const dx = b.x - a.x
        const dy = b.y - a.y
        const len = Math.hypot(dx, dy) || 1

        // perpendicular unit vector
        const px = -dy / len
        const py = dx / len

        for (let s = 1; s <= JITTER_SEGMENTS; s++) {

            const t = s / JITTER_SEGMENTS
            const baseX = a.x + dx * t
            const baseY = a.y + dy * t

            // no jitter on the final anchor point of the whole chain, so the
            // last segment still terminates exactly on the target
            const isLastPoint = (i === points.length - 2) && (s === JITTER_SEGMENTS)
            const jitter = isLastPoint ? 0 : (Math.random() - 0.5) * 2 * JITTER_AMOUNT

            jagged.push({ x: baseX + px * jitter, y: baseY + py * jitter })
        }
    }

    arcState.arcs.push({ points: jagged, life: duration, maxLife: duration, color })
}

// called once per frame from gameLoop — ages out and removes expired arcs
export function updateArcs(dt) {

    for (let i = arcState.arcs.length - 1; i >= 0; i--) {

        arcState.arcs[i].life -= dt

        if (arcState.arcs[i].life <= 0) {
            arcState.arcs.splice(i, 1)
        }
    }
}