// src/ecs/systems/trailSystem.js

import { Position, Velocity, Bullet } from "../constants/components.js"
import { WEAPONS } from "../constants/weapons.js"
import { activeBullets } from "../pools/bulletPool.js"

import { emitEffect } from "../../fx/effects.js"
import { EFFECT } from "../../fx/FXTypes.js"

const TRAIL_BACK_OFFSET = 0.35   // how far behind the bullet's tail a puff spawns
const TRAIL_SIZE_MIN = 0.12
const TRAIL_SIZE_MAX = 0.20
const TRAIL_LIFE = 1.4

// tiny local hex parser so this system doesn't need to pull in three.js
// just to turn a weapon's trailColor string into 0-1 floats
function hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16)
    return {
        r: ((n >> 16) & 255) / 255,
        g: ((n >> 8) & 255) / 255,
        b: (n & 255) / 255,
    }
}

export function trailSystem() {

    const bullets = activeBullets

    for (let i = 0; i < bullets.length; i++) {

        const eid = bullets[i]
        const weapon = WEAPONS[Bullet.type[eid]]

        if (!weapon || !weapon.trail)
            continue

        const vx = Velocity.x[eid]
        const vy = Velocity.y[eid]
        const speed = Math.hypot(vx, vy) || 1

        const backX = -(vx / speed) * TRAIL_BACK_OFFSET
        const backY = -(vy / speed) * TRAIL_BACK_OFFSET

        const { r, g, b } = hexToRgb(weapon.trailColor ?? weapon.glowColor ?? "#888888")

for (let j = 0; j < 3; j++) {

    emitEffect(EFFECT.TRAIL, {

        x:
            Position.x[eid] +
            backX +
            (Math.random() - 0.5) * 0.15,

        y:
            Position.y[eid] +
            backY +
            (Math.random() - 0.5) * 0.15,

        size:
            TRAIL_SIZE_MIN +
            Math.random() *
            (TRAIL_SIZE_MAX - TRAIL_SIZE_MIN),

        maxLife: TRAIL_LIFE,

        r,
        g,
        b,
    })
}
    }
}