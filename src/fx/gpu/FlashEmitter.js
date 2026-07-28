// src/fx/gpu/FlashEmitter.js

import * as THREE from "three"
import { createTypedEffectPool } from "../effectPool.js"

const MAX_FLASHES = 64

export const flashPool = createTypedEffectPool(
    MAX_FLASHES,
    ["angle", "size", "r", "g", "b", "seed"]
)

const tmpColor = new THREE.Color()

export function emitFlash({
    x,
    y,
    angle = 0,
    size = 1,
    maxLife = 0.08,
    color = "#fff2b0",
}) {

    const id = flashPool.allocate()

    if (id < 0) return

    tmpColor.set(color)

    const pos = id * 3

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

    // Static GPU data
    flashPool.instancePosition[pos] = x
    flashPool.instancePosition[pos + 1] = y
    flashPool.instancePosition[pos + 2] = 0.3

    flashPool.instanceColor[pos] = tmpColor.r
    flashPool.instanceColor[pos + 1] = tmpColor.g
    flashPool.instanceColor[pos + 2] = tmpColor.b

    flashPool.instanceRotation[id] = angle
    flashPool.instanceScale[id] = size
    flashPool.instanceAlpha[id] = 1

    flashPool.dirty = true
}

export function updateFlashEmitter(dt) {

    const p = flashPool

    const activeIds = p.activeIds
    const activeCount = p.activeCount

    const life = p.life
    const maxLife = p.maxLife

    const size = p.size

    const instanceScale = p.instanceScale
    const instanceAlpha = p.instanceAlpha

    let dirty = false

    for (let n = 0; n < activeCount; n++) {

        const id = activeIds[n]

        const newLife = life[id] - dt
        life[id] = newLife

        if (newLife <= 0) {

            instanceAlpha[id] = 0
            p.kill(id)
            dirty = true
            continue

        }

        const t = 1 - newLife / maxLife[id]

        const newScale = size[id] * (1 - t * 0.5)
        const newAlpha = 1 - t

        if (instanceScale[id] !== newScale) {
            instanceScale[id] = newScale
            dirty = true
        }

        if (instanceAlpha[id] !== newAlpha) {
            instanceAlpha[id] = newAlpha
            dirty = true
        }

    }

    p.dirty ||= dirty

}