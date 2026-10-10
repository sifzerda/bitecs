// src/ecs/systems/waveSystem.js

import { removeEntity } from "bitecs"
import { world } from "../constants/world.js"
import { useGameStore } from "../../../store/gameStore.js"
import { getProgression } from "../constants/progression.js"
import { simState } from "../../state/simState.js"
import { spawnAsteroid, spawnBoss } from "../spawn.js"
import { bossQuery } from "../constants/queries.js"
import { activeAsteroids, releaseAsteroidEntity } from "../pools/asteroidPool.js"

const SPAWN_RADIUS = 16
let encounterSpawned = false

// ============================================================
// ENCOUNTER SYSTEM
// ============================================================

export function waveSystem() {
    // Wait until the current encounter has been cleared.
    if (simState.asteroidsRemaining > 0) {
        return
    }

    // A boss or asteroid wave is already active.
    if (bossQuery(world).length > 0 || activeAsteroids.length > 0) {
        return
    }

    const level = useGameStore.getState().level
    const progression = getProgression(level)

    // Don't spawn another encounter while this one is awaiting completion.
    if (encounterSpawned) {
        return
    }

    encounterSpawned = true

    if (progression.isBoss) {
        spawnBoss(progression.boss)
        return
    }

    const count = progression.config?.asteroidCount

    if (count == null) {
        console.error("[WAVE SYSTEM] Missing asteroid configuration", {
            level,
            zone: progression.zone.id,
            wave: progression.wave,
        })

        encounterSpawned = false
        return
    }

    spawnAsteroidWave(count)
}

// ============================================================
// SPAWN ASTEROID WAVE
// ============================================================

function spawnAsteroidWave(count) {

    simState.asteroidsRemaining = count

    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        spawnAsteroid(Math.cos(angle) * SPAWN_RADIUS, Math.sin(angle) * SPAWN_RADIUS)
    }
}

// ============================================================
// SKIP CURRENT ENCOUNTER - DEBUG ONLY
// ============================================================

export function skipWave() {

    // --------------------------------------------------------
    // Remove asteroids
    // --------------------------------------------------------

    for (let i = activeAsteroids.length - 1; i >= 0; i--) {
        releaseAsteroidEntity(activeAsteroids[i])
    }

    // --------------------------------------------------------
    // Remove bosses
    // --------------------------------------------------------

    for (const id of bossQuery()) {
        removeEntity(world, id)
    }

    // --------------------------------------------------------
    // Clear runtime encounter state
    // --------------------------------------------------------

    simState.asteroidsRemaining = 0

    // --------------------------------------------------------
    // Complete encounter
    //
    // Do NOT advance the level here.
    // --------------------------------------------------------

    useGameStore
        .getState()
        .completeLevel()
}

export function resetWaveSystem() {
    encounterSpawned = false
}