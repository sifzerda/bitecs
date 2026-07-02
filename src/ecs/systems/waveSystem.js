//src/ecs/systems/waveSystem.js

import { gameStats } from "../../state/gameStats.js"
import { spawnAsteroid, spawnBoss } from "../spawn.js"

const SPAWN_RADIUS = 16

export function waveSystem() {

    // still enemies alive → do nothing
    if (gameStats.asteroidsRemaining > 0 || gameStats.bossAlive)
        return

    const isBossWave = gameStats.wave % 3 === 0

    // -------------------------
    // BOSS WAVE
    // -------------------------
    if (isBossWave) {

        spawnBoss()
        gameStats.bossAlive = true
        gameStats.asteroidsRemaining = 0

        return
    }

    // -------------------------
    // ASTEROID WAVE
    // -------------------------
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