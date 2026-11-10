//src/fx/gpu/SparkEmitter.js

import { createTypedEffectPool } from "../effectPool.js"

export const sparkPool = createTypedEffectPool(4096, ["size", "hot"])


export function emitSparkBurst({
    x,
    y,
    count = 20,
    speed = 8,
    big = false,
    direction = null,
    spread = Math.PI * 0.75,
}) {
    const p = sparkPool

    const directional = Number.isFinite(direction)

    const safeCount = Math.max(
        0,
        Math.min(
            128,
            Math.floor(Number.isFinite(count) ? count : 0)
        )
    )

    for (let n = 0; n < safeCount; n++) {
        const id = p.allocate()

        if (id < 0) break

        const angle = directional
            ? direction + (Math.random() - 0.5) * spread
            : Math.random() * Math.PI * 2

        const velocity =
            speed * (0.3 + Math.random() * 1.1)

        const j = id * 3

        p.x[id] = x
        p.y[id] = y

        p.vx[id] = Math.cos(angle) * velocity
        p.vy[id] = Math.sin(angle) * velocity

        p.life[id] = p.maxLife[id] =
            0.3 + Math.random() * 0.45

        p.size[id] =
            (0.1 + Math.random() * 0.22) *
            (big ? 2 : 1.3)

        p.hot[id] = 1

        p.instanceRotation[id] = angle
        p.instanceStretch[id] = velocity * 0.04
        p.instanceScale[id] = p.size[id]

        p.instancePosition[j] = x
        p.instancePosition[j + 1] = y
        p.instancePosition[j + 2] = 0.5

        p.instanceColor[j] = 1
        p.instanceColor[j + 1] = 0.95
        p.instanceColor[j + 2] = 0.7
    }

    p.dirty = true
}


export function updateSparkEmitter(dt) {

    const p = sparkPool
    const drag = Math.pow(0.985, dt * 60)

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
        p.vy[id] *= drag

        const t = p.life[id] / p.maxLife[id]
        const j = id * 3

        p.instancePosition[j] = p.x[id];
        p.instancePosition[j + 1] = p.y[id]
        p.instanceRotation[id] = Math.atan2(p.vy[id], p.vx[id]);
        p.instanceStretch[id] = Math.max(0.05, Math.hypot(p.vx[id], p.vy[id]) * 0.04)
        p.instanceScale[id] = Math.max(0.001, p.size[id] * t);
        p.instanceAlpha[id] = t
    }
    p.dirty = true
}
