// src/fx/gpu/ExplosionEmitter.js

import { createTypedEffectPool } from "../effectPool.js"

export const explosionPool = createTypedEffectPool(512, ["size", "seed", "age", "rotAngle"], ["axis"])

export function emitExplosion({ x, y, size = 1, maxLife = 1.2 }) {

    const p = explosionPool
    const id = p.allocate();

    if (id < 0)
        return

    p.x[id] = x;
    p.y[id] = y;
    p.size[id] = size;
    p.seed[id] = Math.random()
    p.life[id] = p.maxLife[id] = Math.max(0.001, maxLife)

    const a = p.seed[id] * Math.PI * 2
    const k = 1 / Math.sqrt(1.16)
    const j = id * 3
    p.axis.set([Math.sin(a) * k, Math.cos(a) * k, 0.4 * k], j)
    p.rotAngle[id] = a;
    p.instancePosition.set([x, y, 0.2], j);
    p.instanceScale[id] = size * 0.25
}

export function updateExplosionEmitter(dt) {

    const p = explosionPool

    for (let n = p.activeCount - 1; n >= 0; n--) {

        const id = p.activeIds[n]; p.life[id] -= dt

        if (p.life[id] <= 0) {
            p.kill(id);
            continue
        }

        const t = 1 - p.life[id] / p.maxLife[id]
        const b = Math.min(t / 0.25, 1)
        
        p.instanceScale[id] = p.size[id] * (0.25 + (1 - Math.pow(1 - b, 3)) * 1.05) * (1 + t * 0.45)
        p.rotAngle[id] = t * 1.5 + p.seed[id] * Math.PI * 2;
        p.age[id] = t
    }
    p.dirty = true
}