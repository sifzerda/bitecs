//src/effects/gpu/SmokeEmitter.js

const MAX_SMOKE = 2048

export const smokeParticles = new Array(MAX_SMOKE)

for (let i = 0; i < MAX_SMOKE; i++) {

    smokeParticles[i] = {

        alive: false,

        x: 0,
        y: 0,

        vx: 0,
        vy: 0,

        size: 0,

        life: 0,
        maxLife: 0,

        seed: Math.random(),

    }

}

function allocSmoke() {

    for (let i = 0; i < MAX_SMOKE; i++) {

        if (!smokeParticles[i].alive)
            return smokeParticles[i]

    }

    return null

}

export function emitSmoke({

    x,
    y,

    vx = 0,
    vy = 0,

    direction = 0,

    count = 10,

}) {

    for (let i = 0; i < count; i++) {

        const p = allocSmoke()

        if (!p)
            break

        const spread = (Math.random() - 0.5) * 0.5
        const speed = 2 + Math.random() * 5

        p.alive = true

        p.x = x
        p.y = y

        p.vx = vx + Math.cos(direction + spread) * speed
        p.vy = vy + Math.sin(direction + spread) * speed
        p.size = 0.15 + Math.random() * 0.3
        p.maxLife = 1.5 + Math.random() * 2.0

        p.life = p.maxLife

    }

}

export function updateSmokeEmitter(dt) {

    for (const p of smokeParticles) {

        if (!p.alive)
            continue

        p.life -= dt

        if (p.life <= 0) {

            p.alive = false
            continue

        }

        const age = 1 - p.life / p.maxLife

        // movement

        p.x += p.vx * dt
        p.y += p.vy * dt

        // drag

        p.vx *= 0.985
        p.vy *= 0.985

        // buoyancy

        p.vy += 0.4 * dt

        // turbulence

        p.vx += (Math.random() - 0.5) * 0.4 * dt
        p.vy += (Math.random() - 0.5) * 0.4 * dt

        // expansion

        p.size += 0.8 * dt * (1 - age * 0.7)

    }

}