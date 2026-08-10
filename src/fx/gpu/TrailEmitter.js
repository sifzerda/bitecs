// src/fx/gpu/TrailEmitter.js

import { createTypedEffectPool } from "../effectPool.js"

const MAX_TRAIL = 400

export const trailPool = createTypedEffectPool(
    MAX_TRAIL,
    ["size", "spin", "alpha", "vx", "vy"],   // added vx, vy
    ["color"]
)

export function spawnTrailPuff({
    x, y,
    vx = 0, vy = 0,
    size = 0.2,
    maxLife = 0.4,
    r = 0.5, g = 0.5, b = 0.5
}) {
    const id = trailPool.allocate()
    if (id < 0) return

    const p = trailPool
    p.x[id] = x
    p.y[id] = y
    p.vx[id] = vx
    p.vy[id] = vy
    p.size[id] = size

    const c = id * 3
    p.color[c] = r
    p.color[c + 1] = g
    p.color[c + 2] = b

    p.alpha[id] = 1
    p.spin[id] = Math.random() * Math.PI * 2
    p.life[id] = maxLife
    p.maxLife[id] = maxLife
    p.dirty = true
}

export function updateTrailEmitter(dt) {
    const p = trailPool
    let n = 0

    while (n < p.activeCount) {
        const i = p.activeIds[n]
        let remaining = p.life[i] - dt
        p.life[i] = remaining

        if (remaining <= 0) {
            p.alpha[i] = 0
            p.kill(i)
            continue
        }

        const lifeFrac = remaining / p.maxLife[i]
        const drag = 0.91 + lifeFrac * 0.05

        p.x[i] += p.vx[i] * dt
        p.y[i] += p.vy[i] * dt
        p.vx[i] *= drag
        p.vy[i] *= drag

        p.alpha[i] = lifeFrac * 0.5
        n++
        p.dirty = true
    }
}