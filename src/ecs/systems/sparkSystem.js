// src/ecs/systems/sparkSystem.js

import { activeSparks, releaseSparkEntity } from "../pools/sparkPool"
import { Velocity, Lifetime } from "../constants/components"
import { world } from "../constants/world"

const SPARK_DRAG = 0.90

export function sparkSystem() {
    const dt = world.time.delta

    for (let i = activeSparks.length - 1; i >= 0; i--) {
        const id = activeSparks[i]

        Lifetime.remaining[id] -= dt

        if (Lifetime.remaining[id] <= 0) {
            releaseSparkEntity(id)
            continue
        }

        Velocity.x[id] *= SPARK_DRAG
        Velocity.y[id] *= SPARK_DRAG
    }
}