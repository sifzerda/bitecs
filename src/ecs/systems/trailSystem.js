// src/ecs/systems/trailSystem.js

import { Position, Velocity, Bullet } from "../constants/components.js"
import { WEAPONS } from "../weapons/config/weapons.js"
import { activeBullets } from "../pools/bulletPool.js"
import { emitEffect } from "../../fx/effects.js"
import { EFFECT } from "../../fx/FXTypes.js"

const TRAIL_BACK_OFFSET = 0.22
const TRAIL_SIZE_MIN = 0.08
const TRAIL_SIZE_MAX = 0.14
const TRAIL_LIFE = 0.85

// Distance between consecutive puffs (world units). Smaller = denser.
const SPAWN_SPACING = 0.10

// Per-bullet state: previous position + leftover distance
const trailState = new Map() // eid -> { prevX, prevY, accum }

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
    const seen = new Set()

    for (let i = 0; i < bullets.length; i++) {
        const eid = bullets[i]
        const weapon = WEAPONS[Bullet.type[eid]]

        if (!weapon || !weapon.trail) continue

        seen.add(eid)

        const x = Position.x[eid]
        const y = Position.y[eid]
        const vx = Velocity.x[eid]
        const vy = Velocity.y[eid]
        const speed = Math.hypot(vx, vy) || 1

        const dx = vx / speed
        const dy = vy / speed

        let state = trailState.get(eid)

        if (!state) {
            // first frame for this projectile – just record position, no emit yet
            trailState.set(eid, { prevX: x, prevY: y, accum: 0 })
            continue
        }

        // actual distance travelled since last frame
        const movedX = x - state.prevX
        const movedY = y - state.prevY
        const dist = Math.hypot(movedX, movedY)

        state.accum += dist
        state.prevX = x
        state.prevY = y

        const { r, g, b } = hexToRgb(weapon.trailColor ?? weapon.glowColor ?? "#ff6600")

        // emit one puff for every SPAWN_SPACING units travelled
        while (state.accum >= SPAWN_SPACING) {
            state.accum -= SPAWN_SPACING

            const backX = -dx * TRAIL_BACK_OFFSET
            const backY = -dy * TRAIL_BACK_OFFSET

            // tiny jitter only
            const jx = (Math.random() - 0.5) * 0.03
            const jy = (Math.random() - 0.5) * 0.03

            emitEffect(EFFECT.TRAIL, {
                x: x + backX + jx,
                y: y + backY + jy,

                vx: vx * 0.18 + (Math.random() - 0.5) * 0.12,
                vy: vy * 0.18 + (Math.random() - 0.5) * 0.12,

                size: TRAIL_SIZE_MIN + Math.random() * (TRAIL_SIZE_MAX - TRAIL_SIZE_MIN),
                maxLife: TRAIL_LIFE * (0.85 + Math.random() * 0.25),

                r, g, b,
            })
        }
    }

    // remove state for projectiles that no longer exist
    for (const eid of trailState.keys()) {
        if (!seen.has(eid)) trailState.delete(eid)
    }
}