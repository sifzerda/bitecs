// src/ecs/systems/waveSystem.js

import { removeEntity } from "bitecs"

import { world } from "../constants/world.js"

import {
    useGameStore,
    LEVEL_SECTION,
} from "../../../store/gameStore.js"

import { simState } from "../../state/simState.js"

import {
    spawnAsteroid,
    spawnBoss,
} from "../spawn.js"

import { bossQuery } from "../constants/queries.js"

import { BOSSES } from "../constants/bosses.js"

import {
    activeAsteroids,
    releaseAsteroidEntity,
} from "../pools/asteroidPool.js"


const SPAWN_RADIUS = 16


const BOSS_ROSTER =
    BOSSES.filter(
        (b) => b.key !== "player"
    )


export function waveSystem() {

    if (
        simState.asteroidsRemaining > 0 ||
        simState.bossAlive
    ) {
        return
    }


    const { stage } =
        useGameStore.getState()


    // ========================================================
    // BOSS
    // ========================================================

    if (
        simState.wave >= 3 &&
        !simState.bossDone
    ) {

        const bossIndex =
            (stage - 1) % BOSS_ROSTER.length

        const bossKey =
            BOSS_ROSTER[bossIndex].key

        spawnBoss(bossKey)

        simState.bossAlive = true
        simState.bossDone = true

        return
    }


    // ========================================================
    // ASTEROID WAVE
    // ========================================================

    simState.wave += 1

    simState.bossDone = false

    const count =
        4 + simState.wave * 2

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


// ============================================================
// DEBUG
// ============================================================

export function skipWave() {

    for (
        let i = activeAsteroids.length - 1;
        i >= 0;
        i--
    ) {
        releaseAsteroidEntity(
            activeAsteroids[i]
        )
    }


    const bosses = bossQuery()


    for (let i = 0; i < bosses.length; i++) {

        removeEntity(
            world,
            bosses[i]
        )
    }


    simState.asteroidsRemaining = 0
    simState.bossAlive = false
}