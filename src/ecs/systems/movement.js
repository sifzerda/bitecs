//src/ecs/systems/movement.js
import { movingQuery } from "../constants/queries";
import { Position, Velocity } from "../constants/components";
import { world } from "../constants/world";

export function movementSystem() {

    const dt = world.time.delta

    const entities = movingQuery()

    for (let i = 0; i < entities.length; i++) {

        const id = entities[i]

        Position.x[id] += Velocity.x[id] * dt
        Position.y[id] += Velocity.y[id] * dt

    }

}