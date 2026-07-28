// src/fx/gpu/SmokeEmitter.js

import { createTypedEffectPool } from "../effectPool.js"

const MAX_SMOKE = 2048

export const smokePool = createTypedEffectPool(MAX_SMOKE, ["size", "seed", "alpha", "age"], ["color"])

// ============================================================
// Helpers
// ============================================================
function smoothstepJS(edge0, edge1, x) {
    const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
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

    sizeMin = 0.15,
    sizeMax = 0.45,

    lifeMin = 1.5,
    lifeMax = 3.5
}) {

    const p = smokePool

    for (let n = 0; n < count; n++) {
        const id = p.allocate()
        if (id < 0)
            break

        const angle = direction + (Math.random() - 0.5) * spread
        const speed = speedMin + Math.random() * (speedMax - speedMin)
        const life = lifeMin + Math.random() * (lifeMax - lifeMin)
        const pos = id * 3

        // simulation
        p.x[id] = x
        p.y[id] = y

        p.vx[id] = vx + Math.cos(angle) * speed
        p.vy[id] = vy + Math.sin(angle) * speed

        p.size[id] = sizeMin + Math.random() * (sizeMax - sizeMin)
        p.life[id] = life
        p.maxLife[id] = life
        p.seed[id] = Math.random()
        p.age[id] = 0

        // GPU state

        p.instancePosition[pos] = x
        p.instancePosition[pos + 1] = y
        p.instancePosition[pos + 2] = 0

        p.instanceScale[id] = p.size[id]

        p.alpha[id] = 1
        p.instanceAlpha[id] = 1

        p.dirty = true
    }

}



// ----------------------------------------------------------
// Update
// ----------------------------------------------------------

export function updateSmokeEmitter(dt) {

    const p = smokePool

    for (let n = 0; n < p.activeCount; n++) {

        const i = p.activeIds[n]
        p.life[i] -= dt

        if (p.life[i] <= 0) {

            p.instanceAlpha[i] = 0
            p.instanceScale[i] = 0

            p.kill(i)

            continue
        }

        // movement
        p.x[i] += p.vx[i] * dt
        p.y[i] += p.vy[i] * dt

        // drag
        p.vx[i] *= 0.985
        p.vy[i] *= 0.985
        p.vy[i] += 0.4 * dt

        // GPU position
        const pos = i * 3

        p.instancePosition[pos] = p.x[i]
        p.instancePosition[pos + 1] = p.y[i]

        // age
        const age = 1 - p.life[i] / p.maxLife[i]
        p.age[i] = age
        // scale
        p.instanceScale[i] = p.size[i]

        // fade
        const fadeIn = smoothstepJS(0, 0.1, age)
        const fadeOut = 1 - smoothstepJS(0.6, 1, age)

        p.alpha[i] = fadeIn * fadeOut
        p.instanceAlpha[i] = p.alpha[i]

        p.dirty = true
    }

}

// ----------------------------------------------------------
// Clear
// ----------------------------------------------------------

export function clearSmoke() {

    const p = smokePool

    while (p.activeCount > 0) {
        p.kill(p.activeIds[0])
    }

    p.dirty = true

}