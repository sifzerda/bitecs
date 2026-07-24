// src/fx/gpu/FlashEmitter.js

import * as THREE from "three"
import { createTypedEffectPool } from "../effectPool.js"

const MAX_FLASHES = 64

export const flashPool = createTypedEffectPool(MAX_FLASHES, ["angle", "size", "r", "g", "b", "seed"])

const tmpColor = new THREE.Color()

export function emitFlash({ x, y, angle = 0, size = 1, maxLife = 0.08, color = "#fff2b0" }) {

    const id = flashPool.allocate()

    if (id < 0)
        return

    tmpColor.set(color)

    flashPool.x[id] = x
    flashPool.y[id] = y

    flashPool.angle[id] = angle
    flashPool.size[id] = size

    flashPool.r[id] = tmpColor.r
    flashPool.g[id] = tmpColor.g
    flashPool.b[id] = tmpColor.b

    flashPool.seed[id] = Math.random()

    flashPool.life[id] = maxLife
    flashPool.maxLife[id] = maxLife

    // GPU-ready values — position/tint are static per flash, set once here
    const pos = id * 3
    flashPool.instancePosition[pos] = x
    flashPool.instancePosition[pos + 1] = y
    flashPool.instancePosition[pos + 2] = 0.3

    flashPool.instanceColor[pos] = tmpColor.r
    flashPool.instanceColor[pos + 1] = tmpColor.g
    flashPool.instanceColor[pos + 2] = tmpColor.b

    flashPool.instanceRotation[id] = angle
    flashPool.instanceScale[id] = size
    flashPool.instanceAlpha[id] = 1

}

export function updateFlashEmitter(dt) {

    const p = flashPool

    for (let i = 0; i < p.capacity; i++) {

        if (!p.alive[i])
            continue

        p.life[i] -= dt

        if (p.life[i] <= 0) {
            p.kill(i)
            continue
        }

        const t = 1 - p.life[i] / p.maxLife[i]
        const pop = 1 - t * 0.5

        p.instanceScale[i] = p.size[i] * pop
        p.instanceAlpha[i] = 1 - t

        p.dirty = true

    }

}