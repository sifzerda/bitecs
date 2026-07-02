//src/ecs/systems/waveSystem.js

import { removeEntity } from "bitecs"
import { world } from "../constants/world.js"
import { gameStats } from "../../state/gameStats.js"
import { spawnAsteroid, spawnBoss } from "../spawn.js"
import { asteroidQuery, bossQuery } from "../constants/queries.js"

const SPAWN_RADIUS = 16

export function waveSystem() {

    // still enemies alive → do nothing
    if (gameStats.asteroidsRemaining > 0 || gameStats.bossAlive)
        return

    // -------------------------
    // BOSS CHECK
    // (only fires once per 3-wave cycle, after asteroids are cleared)
    // -------------------------
    if (gameStats.wave > 0 && gameStats.wave % 3 === 0 && !gameStats.bossDone) {

        spawnBoss()
        gameStats.bossAlive = true
        gameStats.bossDone = true

        return
    }

    // -------------------------
    // NEXT ASTEROID WAVE
    // -------------------------
    gameStats.wave++
    gameStats.bossDone = false

    const count = 4 + gameStats.wave * 2
    gameStats.asteroidsRemaining = count

    for (let i = 0; i < count; i++) {

        const angle = Math.random() * Math.PI * 2

        spawnAsteroid(
            Math.cos(angle) * SPAWN_RADIUS,
            Math.sin(angle) * SPAWN_RADIUS
        )
    }
}


// -------------------------
// DEBUG: force-clear the current wave so waveSystem
// spawns the next one on its next tick
// -------------------------
export function skipWave() {

    const asteroids = asteroidQuery()
    for (let i = 0; i < asteroids.length; i++) {
        removeEntity(world, asteroids[i])
    }

    const bosses = bossQuery()
    for (let i = 0; i < bosses.length; i++) {
        removeEntity(world, bosses[i])
    }

    gameStats.asteroidsRemaining = 0
    gameStats.bossAlive = false
}