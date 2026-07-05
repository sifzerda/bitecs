// src/ecs/systems/ricochetSystem.js

import { world } from "../constants/world.js"
import { bulletQuery } from "../constants/queries.js"
import { Position, Velocity, Bullet } from "../constants/components.js"
import { getWeapon } from "../constants/weapons.js"

// TODO: replace with your actual play-area bounds (match whatever
// system currently wraps/clamps the player and asteroids)
const BOUNDS_X = 40
const BOUNDS_Y = 25

export function ricochetSystem() {

    const bullets = bulletQuery()

    for (let i = 0; i < bullets.length; i++) {

        const bid = bullets[i]

        if (Bullet.bounces[bid] <= 0) continue   // not a ricochet bullet, or out of bounces

        const weapon = getWeapon(Bullet.type[bid])
        if (weapon.category !== "bullet") continue

        let bounced = false

        if (Position.x[bid] > BOUNDS_X || Position.x[bid] < -BOUNDS_X) {
            Velocity.x[bid] *= -1
            bounced = true
        }

        if (Position.y[bid] > BOUNDS_Y || Position.y[bid] < -BOUNDS_Y) {
            Velocity.y[bid] *= -1
            bounced = true
        }

        if (bounced) {
            Bullet.bounces[bid] -= 1
        }
    }
}