// src/fx/gpu/DebrisEmitter.js

import { createTypedEffectPool } from "../effectPool.js"

const MAX_DEBRIS = 256
const DRAG = 0.985

export const debrisPool = createTypedEffectPool(
    MAX_DEBRIS,
    [
        "spinSpeed",
        "seedAngle",
        "seed",
        "age",
    ],
    [
        "scale",  // non-uniform sx/sy/sz — instanceScale is scalar-only, doesn't fit
        "axis",   // arbitrary rotation axis — instanceRotation is scalar-only, doesn't fit
    ]
)

// integer attributes — static per id, no per-frame update needed, left as-is
export const kind = new Uint8Array(MAX_DEBRIS)

const KIND_MAP = { rock: 0, metal: 1 }

export function emitDebrisBurst({
    x,
    y,
    count = 10,
    speed = 8,
    size = 1,
    kind: type = "rock",
    maxLife = 1.4,
    spread = Math.PI * 2,
    direction = 0
}) {

    const p = debrisPool
    const kindValue = KIND_MAP[type] ?? 0

    for (let i = 0; i < count; i++) {

        const id = p.allocate()

        if (id < 0)
            break

        const angle = direction + (Math.random() - 0.5) * spread
        const velocity = speed * (0.4 + Math.random() * 0.9)

        p.x[id] = x + (Math.random() - 0.5) * 0.2
        p.y[id] = y + (Math.random() - 0.5) * 0.2
        p.vx[id] = Math.cos(angle) * velocity
        p.vy[id] = Math.sin(angle) * velocity

        const s = size * (0.35 + Math.random() * 0.65)
        const sp = id * 3

        p.scale[sp] = s * (0.7 + Math.random() * 0.6)
        p.scale[sp + 1] = s * (0.7 + Math.random() * 0.6)
        p.scale[sp + 2] = s * (0.7 + Math.random() * 0.6)

        const ax = Math.random() * 2 - 1
        const ay = Math.random() * 2 - 1
        const az = Math.random() * 2 - 1
        const axLen = Math.sqrt(ax * ax + ay * ay + az * az) || 1

        p.axis[sp] = ax / axLen
        p.axis[sp + 1] = ay / axLen
        p.axis[sp + 2] = az / axLen

        p.spinSpeed[id] = (Math.random() - 0.5) * 10
        p.seedAngle[id] = Math.random() * Math.PI * 2

        kind[id] = kindValue

        const life = maxLife * (0.7 + Math.random() * 0.6)

        p.life[id] = life
        p.maxLife[id] = life
        p.seed[id] = Math.random()
        p.age[id] = 0

        const pos = id * 3
        p.instancePosition[pos] = p.x[id]
        p.instancePosition[pos + 1] = p.y[id]
        p.instancePosition[pos + 2] = 0.15

        p.instanceRotation[id] = p.seedAngle[id]

    }

}

export function updateDebrisEmitter(dt) {

    const p = debrisPool
    const drag = Math.pow(DRAG, dt * 60)

    for (let i = 0; i < p.capacity; i++) {

        if (!p.alive[i])
            continue

        p.life[i] -= dt

        if (p.life[i] <= 0) {
            p.kill(i)
            continue
        }

        p.vx[i] *= drag
        p.vy[i] *= drag

        p.x[i] += p.vx[i] * dt
        p.y[i] += p.vy[i] * dt

        const pos = i * 3
        p.instancePosition[pos] = p.x[i]
        p.instancePosition[pos + 1] = p.y[i]

        const t = 1 - p.life[i] / p.maxLife[i]

        p.age[i] = t
        p.instanceRotation[i] = t * p.spinSpeed[i] + p.seedAngle[i]

        p.dirty = true

    }

}