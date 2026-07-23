// src/fx/gpu/ExplosionEmitter.js

import { createTypedEffectPool } from "../effectPool.js"

const MAX_EXPLOSIONS = 512

export const explosionPool = createTypedEffectPool(MAX_EXPLOSIONS, ["size", "seed"])

export function emitExplosion({ x, y, size = 1, maxLife = 1.2 }) {

    const id = explosionPool.allocate()

    if (id < 0)
        return

    explosionPool.x[id] = x
    explosionPool.y[id] = y
    explosionPool.size[id] = size
    explosionPool.seed[id] = Math.random()
    explosionPool.life[id] = maxLife
    explosionPool.maxLife[id] = maxLife

}

export function updateExplosionEmitter(dt) {

    const p = explosionPool

    for (let i = 0; i < p.capacity; i++) {

        if (!p.alive[i])
            continue

        p.life[i] -= dt

        if (p.life[i] <= 0) {

            p.kill(i)
        }
    }

}