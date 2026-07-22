// src/effects/gpu/TrailEmitter.js

const MAX_TRAIL = 400

export const trailPuffs = new Array(MAX_TRAIL)

for (let i = 0; i < MAX_TRAIL; i++) {

    trailPuffs[i] = {
        alive: false,
        x: 0, y: 0,
        life: 0,
        maxLife: 0,
        size: 0,
        r: 0.5, g: 0.5, b: 0.5,
    }
}

let cursor = 0

// ring-buffer alloc: trails churn constantly, so oldest-slot overwrite
// is cheaper and simpler than scanning for a free slot every spawn
function alloc() {
    const p = trailPuffs[cursor]
    cursor = (cursor + 1) % MAX_TRAIL
    return p
}

export function spawnTrailPuff({ x, y, size = 0.2, maxLife = 0.4, r = 0.5, g = 0.5, b = 0.5 }) {

    const p = alloc()

    p.alive = true
    p.x = x
    p.y = y
    p.size = size
    p.maxLife = maxLife
    p.life = maxLife
    p.r = r
    p.g = g
    p.b = b

}

export function updateTrailEmitter(dt) {

    for (const p of trailPuffs) {

        if (!p.alive)
            continue

        p.life -= dt

        if (p.life <= 0) {
            p.alive = false
        }

    }

}