// src/effects/gpu/DebrisEmitter.js

const MAX_DEBRIS = 256

export const debris = new Array(MAX_DEBRIS)

for (let i = 0; i < MAX_DEBRIS; i++) {

    debris[i] = {
        alive: false,
        x: 0, y: 0,
        vx: 0, vy: 0,
        sx: 1, sy: 1, sz: 1,
        axisX: 0, axisY: 0, axisZ: 1,
        spinSpeed: 0,
        seedAngle: 0,
        kind: 0, // 0 = rock, 1 = metal
        life: 0,
        maxLife: 0,
        seed: 0,
    }
}

function alloc() {

    for (let i = 0; i < MAX_DEBRIS; i++) {

        if (!debris[i].alive)
            return debris[i]
    }

    return null
}

const KIND_MAP = { rock: 0, metal: 1 }

export function emitDebrisBurst({
    x, y,
    count = 10,
    speed = 8,
    size = 1,
    kind = "rock",
    maxLife = 1.4,
    spread = Math.PI * 2, // full circle by default
    direction = 0,        // center angle if spread < full circle
}) {

    const kindVal = KIND_MAP[kind] ?? 0

    for (let i = 0; i < count; i++) {

        const d = alloc()

        if (!d)
            return

        const angle = direction + (Math.random() - 0.5) * spread
        const spd = speed * (0.4 + Math.random() * 0.9)

        d.alive = true
        d.x = x + (Math.random() - 0.5) * 0.2
        d.y = y + (Math.random() - 0.5) * 0.2
        d.vx = Math.cos(angle) * spd
        d.vy = Math.sin(angle) * spd

        const s = size * (0.35 + Math.random() * 0.65)
        d.sx = s * (0.7 + Math.random() * 0.6)
        d.sy = s * (0.7 + Math.random() * 0.6)
        d.sz = s * (0.7 + Math.random() * 0.6)

        d.axisX = Math.random() * 2 - 1
        d.axisY = Math.random() * 2 - 1
        d.axisZ = Math.random() * 2 - 1
        d.spinSpeed = (Math.random() - 0.5) * 10
        d.seedAngle = Math.random() * Math.PI * 2

        d.kind = kindVal
        d.maxLife = maxLife * (0.7 + Math.random() * 0.6)
        d.life = d.maxLife
        d.seed = Math.random()
    }
}

const DRAG = 0.985

export function updateDebrisEmitter(dt) {

    for (const d of debris) {

        if (!d.alive)
            continue

        d.life -= dt

        if (d.life <= 0) {
            d.alive = false
            continue
        }

        const drag = Math.pow(DRAG, dt * 60)
        d.vx *= drag
        d.vy *= drag

        d.x += d.vx * dt
        d.y += d.vy * dt
    }
}