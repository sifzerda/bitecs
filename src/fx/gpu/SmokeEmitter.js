// src/fx/gpu/SmokeEmitter.js

import { createTypedEffectPool } from "../effectPool.js"

export const smokePool = createTypedEffectPool(2048, ["size", "seed", "alpha", "age"], ["color"])

// ============================================================
// Helpers
// ============================================================
function smooth(a, b, x) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)
}

//--------------------//

export function emitSmoke({
    x,
    y, vx = 0,
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
        const v = speedMin + Math.random() * (speedMax - speedMin)

        p.x[id] = x;
        p.y[id] = y;
        p.vx[id] = vx + Math.cos(angle) * v
        p.vy[id] = vy + Math.sin(angle) * v
        p.size[id] = sizeMin + Math.random() * (sizeMax - sizeMin)
        p.life[id] = p.maxLife[id] = Math.max(0.001, lifeMin + Math.random() * (lifeMax - lifeMin))
        p.seed[id] = Math.random();
        p.age[id] = 0;
        p.alpha[id] = p.instanceAlpha[id] = 0
        p.instancePosition.set([x, y, 0], id * 3);
        p.instanceScale[id] = p.size[id]
    }

}

// ----------------------------------------------------------
// Update
// ----------------------------------------------------------

export function updateSmokeEmitter(dt) {

    const p = smokePool, drag = Math.pow(0.985, dt * 60)

    for (let n = p.activeCount - 1; n >= 0; n--) {
        
        const id = p.activeIds[n];
        p.life[id] -= dt

        if (p.life[id] <= 0) {
            p.kill(id);
            continue
        }

        p.x[id] += p.vx[id] * dt;
        p.y[id] += p.vy[id] * dt;
        p.vx[id] *= drag;
        p.vy[id] = p.vy[id] * drag + 0.4 * dt

        const j = id * 3, t = 1 - p.life[id] / p.maxLife[id]

        p.instancePosition[j] = p.x[id];
        p.instancePosition[j + 1] = p.y[id];
        p.age[id] = t; p.instanceScale[id] = p.size[id]
        p.alpha[id] = p.instanceAlpha[id] = smooth(0, 0.1, t) * (1 - smooth(0.6, 1, t))

    }
    p.dirty = true
}

// ----------------------------------------------------------
// Clear
// ----------------------------------------------------------

export function clearSmoke() {

    smokePool.clear()
}
