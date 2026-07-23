// src/fx/gpu/TrailEmitter.js

// smoke trails behind explosive projectiles, e.g. missiles, grenades

import { createTypedEffectPool } from "../effectPool.js"

const MAX_TRAIL = 400

export const trailPool = createTypedEffectPool(MAX_TRAIL, [ "size", "r", "g", "b", "spin" ])

export function spawnTrailPuff({ x, y, size = 0.2, maxLife = 0.4, r = 0.5, g = 0.5, b = 0.5 }) {

    const id = trailPool.allocate()

    if(id < 0)
        return

    trailPool.x[id] = x
    trailPool.y[id] = y
    trailPool.size[id] = size
    trailPool.r[id] = r
    trailPool.g[id] = g
    trailPool.b[id] = b
    trailPool.spin[id] = Math.random() * Math.PI * 2
    trailPool.life[id] = maxLife
    trailPool.maxLife[id] = maxLife

}

export function updateTrailEmitter(dt) {

    const p = trailPool

    for(let i = 0; i < p.capacity; i++) {

        if(!p.alive[i])
            continue

        p.life[i] -= dt

        if(p.life[i] <= 0) {
            p.kill(i)
        }

    }

}