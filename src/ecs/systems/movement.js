//src/ecs/systems/movement.js
import { hasComponent } from "bitecs"
import { world } from "../constants/world"
import { movingQuery } from "../constants/queries"
import { Position, Velocity, StatusEffect } from "../constants/components"

export function movementSystem() {

    const dt = world.time.delta
    const entities = movingQuery()

    for (let i = 0; i < entities.length; i++) {
        const id = entities[i]

        if (hasComponent(world, id, StatusEffect) && StatusEffect.frozen[id] > 0) {
            StatusEffect.frozen[id] -= dt
        } else {
            Position.x[id] += Velocity.x[id] * dt
            Position.y[id] += Velocity.y[id] * dt
        }
    }
}