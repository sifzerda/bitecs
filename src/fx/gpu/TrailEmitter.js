// src/fx/gpu/TrailEmitter.js

// smoke trails behind explosive projectiles, e.g. missiles, grenades

import { createTypedEffectPool } from "../effectPool.js"

const MAX_TRAIL = 400

export const trailPool = createTypedEffectPool(MAX_TRAIL, ["size", "spin", "alpha"], ["color"])

export function spawnTrailPuff({
    x,
    y,
    size = 0.2,
    maxLife = 0.4,
    r = 0.5,
    g = 0.5,
    b = 0.5
}) {

    const id = trailPool.allocate()

    if (id < 0)
        return

    const p = trailPool

    p.x[id] = x
    p.y[id] = y

    p.size[id] = size

    const c = id * 3

    trailPool.color[c] = r
    trailPool.color[c + 1] = g
    trailPool.color[c + 2] = b

    p.alpha[id] = 1
    p.spin[id] = Math.random() * Math.PI * 2
    p.life[id] = maxLife
    p.maxLife[id] = maxLife

    // GPU initial values
    const pos = id * 3

    p.instancePosition[pos] = x
    p.instancePosition[pos + 1] = y
    p.instancePosition[pos + 2] = -0.01

    p.instanceScale[id] = size
    p.instanceAlpha[id] = 1
    p.instanceRotation[id] = p.spin[id]

    p.dirty = true

}

export function updateTrailEmitter(dt) {

    const p = trailPool
    let n = 0

    while (n < p.activeCount) {

        const i = p.activeIds[n]
        let remaining = p.life[i] - dt
        p.life[i] = remaining

        // expired

        if (remaining <= 0) {
            p.alpha[i] = 0
            p.instanceAlpha[i] = 0
            p.kill(i)
            // swapped particle occupies this index
            continue
        }

        const fade = remaining / p.maxLife[i]

        p.alpha[i] = fade * 0.75
        p.instanceAlpha[i] = p.alpha[i]
        n++

        p.dirty = true

    }

}