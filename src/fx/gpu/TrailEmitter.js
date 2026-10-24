// src/fx/gpu/TrailEmitter.js

import { createTypedEffectPool } from "../effectPool.js"

// "color" must be declared (3rd arg) so p.color exists as a vec3 array.
// x, y, vx, vy, life and maxLife are provided by the pool itself
// (SmokeEmitter relies on the same fields without declaring them).
export const trailPool = createTypedEffectPool(400, ["size", "spin", "alpha"], ["color"])

export function spawnTrailPuff({
    x, y,
    vx = 0, vy = 0,
    size = 0.2,
    maxLife = 0.4,
    r = 0.5, g = 0.5, b = 0.5
}) {

    const p = trailPool
    const id = p.allocate()

    if (id < 0)
        return

    p.x[id] = x
    p.y[id] = y
    p.vx[id] = vx
    p.vy[id] = vy
    p.size[id] = size
    p.life[id] = p.maxLife[id] = Math.max(0.001, maxLife)
    p.alpha[id] = 1
    p.spin[id] = Math.random() * Math.PI * 2
    p.color.set([r, g, b], id * 3)
}

export function updateTrailEmitter(dt) {

    const p = trailPool

    for (let n = p.activeCount - 1; n >= 0; n--) {

        const id = p.activeIds[n]
        p.life[id] -= dt

        if (p.life[id] <= 0) {
            p.kill(id)
            continue
        }

        const t = p.life[id] / p.maxLife[id]
        const drag = Math.pow(0.91 + t * 0.05, dt * 60)

        p.x[id] += p.vx[id] * dt
        p.y[id] += p.vy[id] * dt
        p.vx[id] *= drag
        p.vy[id] *= drag
        p.alpha[id] = t * 0.5
    }

    p.dirty = true
}