//src/effects/gpu/SparkEmitter.js

const MAX_SPARKS = 4096
const DRAG = 0.985

export const particles = new Array(MAX_SPARKS)

for (let i = 0; i < MAX_SPARKS; i++) {

    particles[i] = {

        alive: false,

        x: 0,
        y: 0,

        vx: 0,
        vy: 0,

        life: 0,
        maxLife: 0,

        size: 0,

        hot: true,

    }

}

function allocateParticle() {

    for (let i = 0; i < MAX_SPARKS; i++) {

        if (!particles[i].alive)
            return particles[i]

    }

    return null

}

export function emitSparkBurst({

    x,
    y,

    count = 20,
    speed = 8,
    big = false,

}) {

    for (let i = 0; i < count; i++) {

        const p = allocateParticle()

        if (!p)
            break

        const angle = Math.random() * Math.PI * 2
        const s = speed * (0.3 + Math.random() * 1.1)

        p.alive = true

        p.x = x
        p.y = y

        p.vx = Math.cos(angle) * s
        p.vy = Math.sin(angle) * s

        p.maxLife = 0.3 + Math.random() * 0.45
        p.life = p.maxLife

        p.size = (0.1 + Math.random() * 0.22) * (big ? 2.0 : 1.3)

        p.hot = true

    }

}

export function updateSparkEmitter(dt) {

    for (let i = 0; i < MAX_SPARKS; i++) {

        const p = particles[i]

        if (!p.alive)
            continue

        p.x += p.vx * dt
        p.y += p.vy * dt

        p.vx *= DRAG
        p.vy *= DRAG

        p.life -= dt

        if (p.life <= 0) {

            p.alive = false
            continue

        }

        p.hot = p.life > p.maxLife * 0.5

    }

}