// src/ecs/systems/sparkSystem.js

import { removeEntity } from "bitecs"
import { world } from "../constants/world.js"
import { sparkQuery } from "../constants/queries.js"
import { Velocity, Lifetime } from "../constants/components.js"

const SPARK_DRAG = 0.90

export function sparkSystem() {

    const dt = world.time.delta
    const sparks = sparkQuery()

    for (let i = 0; i < sparks.length; i++) {

        const id = sparks[i]

        Lifetime.remaining[id] -= dt

        if (Lifetime.remaining[id] <= 0) {
            removeEntity(world, id)
            continue
        }

        Velocity.x[id] *= SPARK_DRAG
        Velocity.y[id] *= SPARK_DRAG
    }
}