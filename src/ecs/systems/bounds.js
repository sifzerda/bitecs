// src/ecs/systems/bounds.js

import { playerQuery, bossQuery } from "../constants/queries.js"
import { Position, Velocity, Asteroid } from "../constants/components.js"
import { activeAsteroids } from "../pools/asteroidPool.js"

const BOUND_X = 16.0
const BOUND_Y = 6.6
const BOSS_MARGIN = 1.5

function wrap(value, bound, radius = 0) {
    const limit = bound + radius
    const span = limit * 2

    if (value > limit) {
        return value - span
    }

    if (value < -limit) {
        return value + span
    }

    return value
}

export function boundsSystem() {
    const players = playerQuery()

    for (let i = 0; i < players.length; i++) {
        const id = players[i]

        Position.x[id] = wrap(Position.x[id], BOUND_X)
        Position.y[id] = wrap(Position.y[id], BOUND_Y)
    }

    for (let i = 0; i < activeAsteroids.length; i++) {
        const id = activeAsteroids[i]
        const radius = Asteroid.radius[id]

        Position.x[id] = wrap(
            Position.x[id],
            BOUND_X,
            radius
        )

        Position.y[id] = wrap(
            Position.y[id],
            BOUND_Y,
            radius
        )
    }

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