//src/ecs/systems/movement.js

import { hasComponent } from "bitecs"
import { world } from "../constants/world.js"
import { movingQuery } from "../constants/queries.js"
import { Position, Velocity, StatusEffect, Bullet, Asteroid } from "../constants/components.js"

export function movementSystem() {

    const dt = world.time.delta

    for (const id of movingQuery()) {

        // Preallocated pool entities retain components while inactive.
        if (hasComponent(world, id, Bullet) && !Bullet.active[id])
            continue
        if (hasComponent(world, id, Asteroid) && !Asteroid.active[id])
            continue
        // The status system is the sole owner of status timers.
        if (hasComponent(world, id, StatusEffect) && StatusEffect.frozen[id] > 0)
            continue
        Position.x[id] += Velocity.x[id] * dt; Position.y[id] += Velocity.y[id] * dt
    }
}
