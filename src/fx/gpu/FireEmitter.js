// src/fx/gpu/FireEmitter.js

import { createTypedEffectPool } from "../effectPool"

const MAX_FIRE = 1024

export const firePool = createTypedEffectPool(MAX_FIRE, ["size"])

export function emitFire({ x, y, count = 20 }) {

    const p = firePool

    for (let i = 0; i < count; i++) {

        const id = p.allocate()

        if (id < 0)
            break

        p.x[id] = x
        p.y[id] = y

        p.vx[id] = (Math.random() - 0.5) * 3
        p.vy[id] = Math.random() * 4
        
        p.size[id] = 0.2 + Math.random() * 0.4
        p.life[id] = 0.5 + Math.random()

        p.maxLife[id] = p.life[id]

        if (p.seed) p.seed[id] = Math.random()

    }

}

export function updateFireEmitter(dt) {

    const p = firePool

    for (let i = 0; i < p.capacity; i++) {

        if (!p.alive[i])
            continue

        p.life[i] -= dt

        if (p.life[i] <= 0) {

            p.kill(i)
            continue

        }

        p.x[i] += p.vx[i] * dt
        p.y[i] += p.vy[i] * dt

        p.vx[i] *= .96
        p.vy[i] *= .96
    }

}