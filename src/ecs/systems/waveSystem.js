// src/ecs/systems/waveSystem.js

import { removeEntity } from "bitecs"

import { world } from "../constants/world.js"

import {
    useGameStore,
} from "../../../store/gameStore.js"

import {
    getProgression,
} from "../constants/progression.js"

import {
    simState,
} from "../../state/simState.js"

import {
    spawnAsteroid,
    spawnBoss,
} from "../spawn.js"

import {
    bossQuery,
} from "../constants/queries.js"

import {
    activeAsteroids,
    releaseAsteroidEntity,
} from "../pools/asteroidPool.js"

const SPAWN_RADIUS = 16

export function waveSystem() {

    // --------------------------------------------------------
    // Encounter already has enemies
    // --------------------------------------------------------

    if (simState.asteroidsRemaining > 0) {
        return
    }

    if (bossQuery().length > 0) {
        return
    }

    // --------------------------------------------------------
    // Current encounter
    // --------------------------------------------------------

    const level =
        useGameStore.getState().level

    const {
        zone,
        wave,
        isBoss,
    } = getProgression(level)

    // --------------------------------------------------------
    // Boss
    // --------------------------------------------------------

    if (isBoss) {

        spawnBoss(zone.boss)

        return
    }

    // --------------------------------------------------------
    // Asteroid wave
    // --------------------------------------------------------

    const config =
        zone.waves[wave - 1]

    if (!config) {
        console.error(
            `Missing wave ${wave} for zone ${zone.id}`
        )
        return
    }

    spawnAsteroidWave(
        config.asteroidCount
    )
}

// ------------------------------------------------------------
// Spawn asteroid wave
// ------------------------------------------------------------

function spawnAsteroidWave(count) {

    simState.asteroidsRemaining = count

    for (let i = 0; i < count; i++) {

        const angle =
            Math.random() * Math.PI * 2

        spawnAsteroid(
            Math.cos(angle) * SPAWN_RADIUS,
            Math.sin(angle) * SPAWN_RADIUS
        )
    }
}

// ------------------------------------------------------------
// Skip current encounter
// ------------------------------------------------------------

export function skipWave() {

    // Remove asteroids

    for (let i = activeAsteroids.length - 1; i >= 0; i--) {
        releaseAsteroidEntity(activeAsteroids[i])
    }

    // Remove bosses

    for (const id of bossQuery()) {
        removeEntity(world, id)
    }

    simState.asteroidsRemaining = 0

    useGameStore
        .getState()
        .advanceWave()
}