//src/ecs/systems/waveSystem.js

import { removeEntity } from "bitecs"
import { world } from "../constants/world.js"
import { gameState } from "../../state/gameState.js"
import { spawnAsteroid, spawnBoss } from "../spawn.js"
import { bossQuery } from "../constants/queries.js"
import { BOSSES } from "../constants/bosses.js"
import { activeAsteroids, releaseAsteroidEntity } from "../pools/asteroidPool"

const SPAWN_RADIUS = 16

// The "player" entry in BOSSES (index 0) is the player ship config, not a
// real boss — exclude it so wave progression only cycles through actual
// bosses, in list order: Space Cowboy, Rambo, Rogue Mars Missiler, War
// Machine, boss5, boss6, ... wrapping back to Space Cowboy once you've
// cycled through everyone.
const BOSS_ROSTER = BOSSES.filter((b) => b.key !== "player")

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

        // Cycle through the boss roster in order so each boss fight looks
        // different — bossNumber 1 → BOSS_ROSTER[0] (Space Cowboy),
        // 2 → BOSS_ROSTER[1] (Rambo), etc., wrapping back around once
        // you've gone through every boss. The weapon each boss fires is
        // no longer chosen here — spawnBoss derives it from that boss's
        // own mounted gun (bossCfg.gun.typeId), so it's always in sync
        // with what's rendered on the ship.
        const bossKey = BOSS_ROSTER[(bossNumber - 1) % BOSS_ROSTER.length].key

        spawnBoss(bossKey)

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