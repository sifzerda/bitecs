// src/ecs/systems/bounds.js

import { playerQuery, bossQuery } from "../constants/queries.js";
import { Position, Velocity } from "../constants/components.js";
import { world } from "../constants/world.js";
import { activeAsteroids } from "../pools/asteroidPool.js";

const BOUND_X = 16.0
const BOUND_Y = 6.6
const BOSS_MARGIN = 1.5

export function boundsSystem() {

    //-------------------------
    // Player Wrap
    //-------------------------

    const players = playerQuery()

    for (let i = 0; i < players.length; i++) {

        const id = players[i]

        if (Position.x[id] > BOUND_X)
            Position.x[id] = -BOUND_X

        else if (Position.x[id] < -BOUND_X)
            Position.x[id] = BOUND_X

        if (Position.y[id] > BOUND_Y)
            Position.y[id] = -BOUND_Y

        else if (Position.y[id] < -BOUND_Y)
            Position.y[id] = BOUND_Y
    }

    //-------------------------
    // Asteroid Wrap
    //-------------------------

    const asteroids = activeAsteroids

    for (let i = 0; i < asteroids.length; i++) {

        const id = asteroids[i]

        if (Position.x[id] > BOUND_X)
            Position.x[id] = -BOUND_X

        else if (Position.x[id] < -BOUND_X)
            Position.x[id] = BOUND_X

        if (Position.y[id] > BOUND_Y)
            Position.y[id] = -BOUND_Y

        else if (Position.y[id] < -BOUND_Y)
            Position.y[id] = BOUND_Y
    }

    //-------------------------
    // Boss Clamp + Bounce
    //-------------------------

    const bosses = bossQuery()
    const bx = BOUND_X - BOSS_MARGIN
    const by = BOUND_Y - BOSS_MARGIN

    for (let i = 0; i < bosses.length; i++) {

        const id = bosses[i]

        if (Position.x[id] > bx) {
            Position.x[id] = bx
            Velocity.x[id] = -Math.abs(Velocity.x[id])
        } else if (Position.x[id] < -bx) {
            Position.x[id] = -bx
            Velocity.x[id] = Math.abs(Velocity.x[id])
        }

        if (Position.y[id] > by) {
            Position.y[id] = by
            Velocity.y[id] = -Math.abs(Velocity.y[id])
        } else if (Position.y[id] < -by) {
            Position.y[id] = -by
            Velocity.y[id] = Math.abs(Velocity.y[id])
        }
    }
}