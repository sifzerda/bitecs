// src/ecs/systems/bounds.js

import { playerQuery, asteroidQuery } from "../constants/queries.js";
import { Position } from "../constants/components.js";
import { world } from "../constants/world.js";

const BOUND_X = 6.6
const BOUND_Y = 5.0

export function boundsSystem() {

    //-------------------------
    // Player Clamp
    //-------------------------

    const players = playerQuery()

    for (let i = 0; i < players.length; i++) {

        const id = players[i]

        Position.x[id] = Math.max(-BOUND_X, Math.min(BOUND_X, Position.x[id]))
        Position.y[id] = Math.max(-BOUND_Y, Math.min(BOUND_Y, Position.y[id]))
    }

    //-------------------------
    // Asteroid Wrap
    //-------------------------

    const asteroids = asteroidQuery()

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

}