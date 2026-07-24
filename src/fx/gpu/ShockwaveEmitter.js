// src/fx/gpu/ShockwaveEmitter.js

import { createTypedEffectPool } from "../effectPool.js"

const MAX_SHOCKWAVES = 64

export const shockwavePool = createTypedEffectPool(MAX_SHOCKWAVES, [ "radius", "thickness" ])

export function emitShockwave({
    x,
    y,
    radius = 1,
    thickness = 0.25,
    maxLife = 0.5
}) {

    const id = shockwavePool.allocate()

    if (id < 0)
        return

    shockwavePool.x[id] = x
    shockwavePool.y[id] = y

    shockwavePool.radius[id] = radius
    shockwavePool.thickness[id] = thickness

    shockwavePool.life[id] = maxLife
    shockwavePool.maxLife[id] = maxLife

    const pos = id * 3
    shockwavePool.instancePosition[pos] = x
    shockwavePool.instancePosition[pos + 1] = y
    shockwavePool.instancePosition[pos + 2] = 0.05

    shockwavePool.instanceScale[id] = radius
    shockwavePool.instanceAlpha[id] = 1

}

export function updateShockwaveEmitter(dt) {

    const p = shockwavePool

    for (let i = 0; i < p.capacity; i++) {

        if (!p.alive[i])
            continue

        p.life[i] -= dt

        if (p.life[i] <= 0) {
            p.kill(i)
            continue
        }

        const t = 1 - p.life[i] / p.maxLife[i]
        const radius = p.radius[i] * (1 + t * 5)

        const pos = i * 3
        p.instancePosition[pos] = p.x[i]
        p.instancePosition[pos + 1] = p.y[i]

        p.instanceScale[i] = radius
        p.instanceAlpha[i] = 1 - t

        p.dirty = true

    }

}