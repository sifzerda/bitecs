// src/fx/gpu/ShockwaveEmitter.js

import { createTypedEffectPool } from "../effectPool.js"

const MAX_SHOCKWAVES = 64

export const shockwavePool =
    createTypedEffectPool(
        MAX_SHOCKWAVES,
        [
            "radius",
            "thickness"
        ]
    )

export function emitShockwave({

    x,
    y,

    radius = 1,
    thickness = 0.25,

    maxLife = 0.5

}) {

    const id =
        shockwavePool.allocate()

    if (id < 0)
        return

    shockwavePool.x[id] = x
    shockwavePool.y[id] = y

    shockwavePool.radius[id] = radius
    shockwavePool.thickness[id] = thickness

    shockwavePool.life[id] = maxLife
    shockwavePool.maxLife[id] = maxLife

}

export function updateShockwaveEmitter(dt) {

    const p = shockwavePool

    for (let i = 0; i < p.capacity; i++) {

        if (!p.alive[i])
            continue

        p.life[i] -= dt

        if (p.life[i] <= 0)
            p.kill(i)
    }

}