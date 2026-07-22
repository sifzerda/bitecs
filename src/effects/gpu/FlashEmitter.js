// src/effects/gpu/FlashEmitter.js

import * as THREE from "three"

const MAX_FLASHES = 64

const tmpColor = new THREE.Color()

export const flashes = new Array(MAX_FLASHES)

for (let i = 0; i < MAX_FLASHES; i++) {

    flashes[i] = {
        alive: false,
        x: 0, y: 0,
        angle: 0,
        size: 1,
        life: 0,
        maxLife: 0,
        seed: 0,
        r: 1, g: 0.9, b: 0.7,
    }
}

function alloc() {

    for (let i = 0; i < MAX_FLASHES; i++) {

        if (!flashes[i].alive)
            return flashes[i]
    }

    return null
}

export function emitFlash({
    x, y,
    angle = 0,
    size = 1,
    maxLife = 0.08,
    color = "#fff2b0",
}) {

    const f = alloc()

    if (!f)
        return

    tmpColor.set(color)

    f.alive = true
    f.x = x
    f.y = y
    f.angle = angle
    f.size = size
    f.maxLife = maxLife
    f.life = maxLife
    f.seed = Math.random()
    f.r = tmpColor.r
    f.g = tmpColor.g
    f.b = tmpColor.b

}

export function updateFlashEmitter(dt) {

    for (const f of flashes) {

        if (!f.alive)
            continue

        f.life -= dt

        if (f.life <= 0) {
            f.alive = false
        }

    }

}