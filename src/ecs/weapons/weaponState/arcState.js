// src/ecs/weapons/weaponState/arcState.js

import {
    Arc,
    ArcPointsX,
    ArcPointsY,
    ARC_MAX_POINTS,
} from "../../constants/components.js"

import {
    acquireArcEntity,
    releaseArcEntity,
    activeArcs,
} from "../../pools/arcPool.js"

const DEFAULT_COLOR = "#1F51FF"

const JITTER_SEGMENTS = 5
const JITTER_AMOUNT = 0.12

// --------------------------------------------------
// Colour conversion
// --------------------------------------------------

const colorCache = new Map()

function getRGB(hex) {

    let cached = colorCache.get(hex)

    if (cached)
        return cached

    cached = {
        r: parseInt(hex.slice(1, 3), 16) / 255,
        g: parseInt(hex.slice(3, 5), 16) / 255,
        b: parseInt(hex.slice(5, 7), 16) / 255,
    }

    colorCache.set(hex, cached)

    return cached
}

// --------------------------------------------------

export function pushArc(points, duration = 0.12, color = DEFAULT_COLOR) {

    if (!points || points.length < 2)
        return

    const id = acquireArcEntity()

    if (id === -1)
        return

    Arc.life[id] = duration
    Arc.maxLife[id] = duration

    const rgb = getRGB(color)

    Arc.colorR[id] = rgb.r
    Arc.colorG[id] = rgb.g
    Arc.colorB[id] = rgb.b

    let point = 0

    ArcPointsX[id][point] = points[0].x
    ArcPointsY[id][point] = points[0].y
    point++

    for (let i = 0; i < points.length - 1; i++) {

        const a = points[i]
        const b = points[i + 1]

        const dx = b.x - a.x
        const dy = b.y - a.y

        const len = Math.hypot(dx, dy) || 1

        const px = -dy / len
        const py = dx / len

        for (let s = 1; s <= JITTER_SEGMENTS; s++) {

            if (point >= ARC_MAX_POINTS)
                break

            const t = s / JITTER_SEGMENTS

            const baseX = a.x + dx * t
            const baseY = a.y + dy * t

            const isLast =
                i === points.length - 2 &&
                s === JITTER_SEGMENTS

            const jitter = isLast
                ? 0
                : (Math.random() - 0.5) * 2 * JITTER_AMOUNT

            ArcPointsX[id][point] = baseX + px * jitter
            ArcPointsY[id][point] = baseY + py * jitter

            point++
        }
    }

    Arc.pointCount[id] = point
}

// --------------------------------------------------

export function updateArcs(dt) {

    for (let i = activeArcs.length - 1; i >= 0; i--) {

        const id = activeArcs[i]

        Arc.life[id] -= dt

        if (Arc.life[id] <= 0) {
            releaseArcEntity(id)
        }
    }
}