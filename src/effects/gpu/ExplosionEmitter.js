//src/effects/gpu/ExplosionEmitter.js

const MAX_EXPLOSIONS = 512

export const explosions = new Array(MAX_EXPLOSIONS)

for (let i = 0; i < MAX_EXPLOSIONS; i++) {

    explosions[i] = {

        alive: false,
        x: 0,
        y: 0,
        life: 0,
        maxLife: 0,
        size: 0,
        seed: 0,

    }

}

function alloc() {

    for (let i = 0; i < MAX_EXPLOSIONS; i++) {

        if (!explosions[i].alive)
            return explosions[i]
    }

    return null

}

export function emitExplosion({ x, y, size = 1, maxLife = 1.2 }) {

    const e = alloc()

    if (!e)
        return

    e.alive = true
    e.x = x
    e.y = y
    e.size = size
    e.maxLife = maxLife
    e.life = e.maxLife
    e.seed = Math.random()

}

export function updateExplosionEmitter(dt) {

    for (const e of explosions) {

        if (!e.alive)
            continue

        e.life -= dt

        if (e.life <= 0) {
            e.alive = false
        }

    }

}