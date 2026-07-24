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

        sparkPool.instanceRotation[id] = angle
        sparkPool.instanceStretch[id] = velocity * 0.04

        const life = 0.3 + Math.random() * 0.45
        sparkPool.life[id] = life
        sparkPool.maxLife[id] = life

        sparkPool.size[id] = (0.1 + Math.random() * 0.22) * (big ? 2 : 1.3)
        sparkPool.hot[id] = 1

        // GPU position
        const pos = id * 3

        sparkPool.instancePosition[pos] = x
        sparkPool.instancePosition[pos + 1] = y
        sparkPool.instancePosition[pos + 2] = 0.5

        sparkPool.instanceScale[id] = sparkPool.size[id]
        sparkPool.instanceAlpha[id] = 1

        // GPU color
        const c = id * 3

        sparkPool.instanceColor[c] = 1
        sparkPool.instanceColor[c + 1] = 0.95
        sparkPool.instanceColor[c + 2] = 0.7

        sparkPool.dirty = true

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

        const speed = Math.sqrt( p.vx[i] * p.vx[i] + p.vy[i] * p.vy[i])

        p.instanceRotation[i] = Math.atan2( p.vy[i], p.vx[i] )
        p.instanceStretch[i] = Math.max(0.05, speed * 0.04)

        p.life[i] -= dt

        if (p.life[i] <= 0) {
            p.instanceAlpha[i] = 0
            p.instanceScale[i] = 0
            p.kill(i)
            continue
        }

        const pos = i * 3
        p.instancePosition[pos] = p.x[i]
        p.instancePosition[pos + 1] = p.y[i]

        const t = p.life[i] / p.maxLife[i]

        p.instanceScale[i] = Math.max(0.001, p.size[i] * t)
        p.instanceAlpha[i] = t

        // update heat

        p.hot[i] = p.life[i] > p.maxLife[i] * 0.5 ? 1 : 0

        const c = i * 3

        if (p.hot[i]) {
            p.instanceColor[c] = 1
            p.instanceColor[c + 1] = 0.95
            p.instanceColor[c + 2] = 0.7
        }
        else {
            p.instanceColor[c] = 1
            p.instanceColor[c + 1] = 0.35
            p.instanceColor[c + 2] = 0.15
        }
        p.dirty = true
    }

}