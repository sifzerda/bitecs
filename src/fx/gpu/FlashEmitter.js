// src/fx/gpu/FlashEmitter.js

import * as THREE from "three"
import { createTypedEffectPool } from "../effectPool.js"

const MAX_FLASHES = 64

export const flashPool = createTypedEffectPool(MAX_FLASHES, [ "angle", "size", "r", "g", "b", "seed" ])

const tmpColor = new THREE.Color()

export function emitFlash({ x, y, angle = 0, size = 1, maxLife = 0.08, color = "#fff2b0" }) {

    const id = flashPool.allocate()

    if(id < 0)
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

}

export function updateFlashEmitter(dt) {

    const p = flashPool

    for(let i = 0; i < p.capacity; i++) {

        if(!p.alive[i])
            continue

        p.life[i] -= dt

        if(p.life[i] <= 0) {

            p.kill(i)

        }

    }

}