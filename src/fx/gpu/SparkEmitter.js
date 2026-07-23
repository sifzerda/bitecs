//src/fx/gpu/SparkEmitter.js

import { createTypedEffectPool } from "../effectPool.js"

const MAX_SPARKS = 4096

export const sparkPool = createTypedEffectPool(MAX_SPARKS, ["size", "hot"])

export function emitSparkBurst({ x, y, count = 20, speed = 8, big = false }) {

    for (let i = 0; i < count; i++) {

        const id = sparkPool.allocate()

        if (id < 0)
            break

        const angle = Math.random() * Math.PI * 2
        const velocity = speed * (0.3 + Math.random() * 1.1)

        sparkPool.x[id] = x
        sparkPool.y[id] = y
        sparkPool.vx[id] = Math.cos(angle) * velocity
        sparkPool.vy[id] = Math.sin(angle) * velocity

        const life = 0.3 + Math.random() * 0.45

        sparkPool.life[id] = life
        sparkPool.maxLife[id] = life

        sparkPool.size[id] = (0.1 + Math.random() * 0.22) * (big ? 2 : 1.3)
        sparkPool.hot[id] = 1
    }

}

export function updateSparkEmitter(dt) {

    const p = sparkPool

    for (let i = 0; i < p.capacity; i++) {

        if (!p.alive[i])
            continue

        p.x[i] += p.vx[i] * dt
        p.y[i] += p.vy[i] * dt

        p.vx[i] *= 0.985
        p.vy[i] *= 0.985

        p.life[i] -= dt

        if (p.life[i] <= 0) {
            p.kill(i)
            continue
        }

        p.hot[i] = p.life[i] > p.maxLife[i] * 0.5 ? 1 : 0

    }

}