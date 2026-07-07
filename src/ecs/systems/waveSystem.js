//src/ecs/systems/waveSystem.js

import { removeEntity } from "bitecs"
import { world } from "../constants/world.js"
import { gameState } from "../../state/gameState.js"
import { spawnAsteroid, spawnBoss } from "../spawn.js"
import {  bossQuery } from "../constants/queries.js"
import {activeAsteroids, releaseAsteroidEntity } from "../pools/asteroidPool"

const SPAWN_RADIUS = 16

export function waveSystem() {

    // still enemies alive → do nothing
    if (gameState.asteroidsRemaining > 0 || gameState.bossAlive)
        return

    // -------------------------
    // BOSS CHECK
    // (only fires once per 3-wave cycle, after asteroids are cleared)
    // -------------------------
if (gameState.wave > 0 &&
    gameState.wave % 3 === 0 &&
    !gameState.bossDone) {

    const bossNumber = gameState.wave / 3
    const weaponId = Math.min(bossNumber, 4)

    spawnBoss(weaponId)

    gameState.bossAlive = true
    gameState.bossDone = true

    return
}

    // -------------------------
    // NEXT ASTEROID WAVE
    // -------------------------
    gameState.wave++
    gameState.bossDone = false

    const count = 4 + gameState.wave * 2
    gameState.asteroidsRemaining = count

    for (let i = 0; i < count; i++) {

        const angle = Math.random() * Math.PI * 2

        spawnAsteroid(
            Math.cos(angle) * SPAWN_RADIUS,
            Math.sin(angle) * SPAWN_RADIUS
        )
    }
}


// -------------------------
// -------------------------
export function skipWave() {

    for (let i = activeAsteroids.length - 1; i >= 0; i--) {
        releaseAsteroidEntity(activeAsteroids[i])
    }

    const bosses = bossQuery()
    for (let i = 0; i < bosses.length; i++) {
        removeEntity(world, bosses[i])
    }

    gameState.asteroidsRemaining = 0
    gameState.bossAlive = false
}