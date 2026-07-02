// src/ecs/systems/combat.js

import { removeEntity } from "bitecs"
import { world } from "../constants/world.js"
import { bulletQuery, asteroidQuery } from "../constants/queries.js"
import { Position, Health, Lifetime } from "../constants/components.js"
import { spawnAsteroid } from "../spawn.js"
import { gameStats } from "../../state/gameStats.js"

const HIT_RADIUS = 0.7
const SPAWN_RADIUS = 16

function spawnNextWave() {

    if (gameStats.asteroidsRemaining > 0)
        return

    const count = 4 + gameStats.wave * 2

    gameStats.asteroidsRemaining = count

    for (let i = 0; i < count; i++) {

        const angle = Math.random() * Math.PI * 2

        spawnAsteroid(
            Math.cos(angle) * SPAWN_RADIUS,
            Math.sin(angle) * SPAWN_RADIUS
        )

    }

    gameStats.wave++

}

export function combatSystem() {

    const dt = world.time.delta

    spawnNextWave()

    const bullets = bulletQuery()
    const asteroids = asteroidQuery()

    //-------------------------
    // Bullets
    //-------------------------

    for (let i = 0; i < bullets.length; i++) {

        const bid = bullets[i]

        Lifetime.remaining[bid] -= dt

        if (Lifetime.remaining[bid] <= 0) {

            removeEntity(world, bid)
            continue

        }

        //-------------------------
        // Bullet vs Asteroid
        //-------------------------

        for (let j = 0; j < asteroids.length; j++) {

            const aid = asteroids[j]

            const dx = Position.x[bid] - Position.x[aid]
            const dy = Position.y[bid] - Position.y[aid]

            if (dx * dx + dy * dy > HIT_RADIUS * HIT_RADIUS)
                continue

            Health.current[aid] -= 10

            removeEntity(world, bid)

            if (Health.current[aid] <= 0) {

                removeEntity(world, aid)

                gameStats.score += 100
                gameStats.asteroidsRemaining--

            }

            break

        }

    }

}