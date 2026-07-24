// src/fx/gpu/SmokeEmitter.js

import { createTypedEffectPool } from "../effectPool.js"

const MAX_SMOKE = 2048

export const smokePool = createTypedEffectPool(MAX_SMOKE, ["size", "seed", "alpha", "age"], ["color"])

// helper
function smoothstepJS(edge0, edge1, x) {
    const t = Math.min(1, Math.max(0, (x-edge0)/(edge1-edge0)))
    return t * t * (3 - 2 * t)
}

//--------------------//

export function emitSmoke({
    x,
    y,
    vx = 0,
    vy = 0,

    direction = 0,
    spread = 0.5,

    count = 10,

    speedMin = 2,
    speedMax = 7,

    sizeMin = .15,
    sizeMax = .45,

    lifeMin = 1.5,
    lifeMax = 3.5
}) {

    for (let i = 0; i < count; i++) {

        const id = smokePool.allocate()

        if (id < 0)
            break

        const angle = direction + (Math.random() - 0.5) * spread
        const speed = speedMin + Math.random() * (speedMax - speedMin)
        const pos = id * 3
        const life = lifeMin + Math.random() * (lifeMax - lifeMin)

        smokePool.x[id] = x
        smokePool.y[id] = y

        smokePool.vx[id] = vx + Math.cos(angle) * speed
        smokePool.vy[id] = vy + Math.sin(angle) * speed
        smokePool.size[id] = sizeMin + Math.random() * (sizeMax - sizeMin)

        smokePool.life[id] = life
        smokePool.maxLife[id] = life

        smokePool.seed[id] = Math.random()

        smokePool.instancePosition[pos] = x
        smokePool.instancePosition[pos + 1] = y
        smokePool.instancePosition[pos + 2] = 0

        smokePool.instanceScale[id] = smokePool.size[id]
        smokePool.alpha[id] = 1
        smokePool.age[id] = 0

        smokePool.instanceAlpha[id] = 1
        
    }

}

export function updateSmokeEmitter(dt) {

    const p = smokePool

    for (let i = 0; i < p.capacity; i++) {

        if (!p.alive[i])
            continue

        p.life[i] -= dt

        if (p.life[i] <= 0) {
            p.instanceAlpha[i] = 0
            p.kill(i)
            continue

        }

        p.x[i] += p.vx[i] * dt
        p.y[i] += p.vy[i] * dt

        p.vx[i] *= .985
        p.vy[i] *= .985
        p.vy[i] += 0.4 * dt

        const pos = i * 3
        p.instancePosition[pos] = p.x[i]
        p.instancePosition[pos + 1] = p.y[i]

        const age = 1 - p.life[i] / p.maxLife[i]
        p.age[i] = age
         
        p.instanceScale[i] = p.size[i]

        const fadeIn = smoothstepJS(0, 0.1, age)
        const fadeOut = 1 - smoothstepJS(0.6, 1, age)

        p.alpha[i] = fadeIn * fadeOut
        p.instanceAlpha[i] = p.alpha[i]

        p.dirty = true

    }

}

export function clearSmoke() {

    smokePool.alive.fill(0)

}