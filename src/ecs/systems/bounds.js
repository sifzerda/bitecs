// src/ecs/systems/bounds.js

import { playerQuery, asteroidQuery } from "../constants/queries.js";
import { Position } from "../components.js";

const BOUND_X = 6.6;
const BOUND_Y = 5.0;

export function boundsSystem() {

    const players = playerQuery();

    for (let i = 0; i < players.length; i++) {

        const eid = players[i];

        Position.x[eid] = Math.max(-BOUND_X, Math.min(BOUND_X, Position.x[eid]));
        Position.y[eid] = Math.max(-BOUND_Y, Math.min(BOUND_Y, Position.y[eid]));

    }

    const asteroids = asteroidQuery();

    for (let i = 0; i < asteroids.length; i++) {

        const eid = asteroids[i];

        if (Position.x[eid] > BOUND_X)
            Position.x[eid] = -BOUND_X;

        if (Position.x[eid] < -BOUND_X)
            Position.x[eid] = BOUND_X;

        if (Position.y[eid] > BOUND_Y)
            Position.y[eid] = -BOUND_Y;

        if (Position.y[eid] < -BOUND_Y)
            Position.y[eid] = BOUND_Y;
    }
}