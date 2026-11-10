// src/ecs/waves/waveSystem.js

import { removeEntity } from "bitecs"

import { world } from "../constants/world.js"

import {
    Position,
    BossAI,
} from "../constants/components.js"

import {
    bossQuery,
    playerQuery,
} from "../constants/queries.js"

import {
    useGameStore,
    SCREEN,
} from "../../../store/gameStore.js"

import { getProgression } from "../constants/progression.js"
import { startState } from "../../state/startState.js"

import { spawnBoss } from "../bosses/BossManager.js"

import {
    activeAsteroids,
    despawnAsteroid,
} from "../asteroids/AsteroidManager.js"

import {
    getDifficultyProfile,
} from "../difficulty/difficultyScaling.js"

import {
    createWaveComposition,
} from "./waveComposition.js"

import {
    startScheduledWave,
    updateWaveScheduler,
    resetWaveScheduler,
} from "./waveScheduler.js"

import {
    getRemainingAsteroidCount,
} from "./waveState.js"

import { beginEncounterClear } from "../systems/encounterSystem.js"

import {
    getCompositionAdaptation,
} from "../difficulty/compositionAdaptation.js"

const BOSS_SPAWN_DISTANCE = 10
const BOSS_ENTRANCE_DELAY = 1.5

let encounterSpawned = false

function getWaveIndex(level) {
    return Math.max(
        0,
        Math.min(2, (level - 1) % 4)
    )
}

function spawnBossEncounter(key) {
    const id = spawnBoss(key)

    if (id == null || id === -1) {
        console.error(
            "[waveSystem] Failed to spawn boss:",
            key
        )

        beginEncounterClear()
        return
    }

    const pid = playerQuery()[0]

    const playerX =
        pid === undefined ? 0 : Position.x[pid]

    const playerY =
        pid === undefined ? 0 : Position.y[pid]

    Position.x[id] =
        playerX >= 0
            ? -BOSS_SPAWN_DISTANCE
            : BOSS_SPAWN_DISTANCE

    Position.y[id] =
        playerY >= 0 ? -3 : 3

    BossAI.shootTimer[id] = BOSS_ENTRANCE_DELAY
    BossAI.decisionCooldown[id] = BOSS_ENTRANCE_DELAY
}

export function waveSystem() {
    const state = useGameStore.getState()

    if (
        state.screen !== SCREEN.PLAY ||
        state.paused
    ) {
        return
    }

    if (startState.encounterPhase === "active") {
        updateWaveScheduler(world.time.delta)
        return
    }

    if (
        encounterSpawned ||
        startState.encounterPhase !== "idle"
    ) {
        return
    }

    if (playerQuery().length === 0) return

    if (
        activeAsteroids.length > 0 ||
        bossQuery().length > 0
    ) {
        return
    }

    const progression = getProgression(state.level)
    if (!progression) return

    encounterSpawned = true
    startState.encounterPhase = "active"

    if (progression.isBoss) {
        startState.asteroidsRemaining = 0
        spawnBossEncounter(progression.boss)
        return
    }

    const baseCount = progression.config?.asteroidCount

    if (
        !Number.isInteger(baseCount) ||
        baseCount <= 0
    ) {
        console.error(
            "[waveSystem] Invalid asteroid count:",
            baseCount
        )

        startState.encounterPhase = "idle"
        encounterSpawned = false
        return
    }

    const difficulty = getDifficultyProfile({
        zoneIndex: progression.zoneIndex,
        waveIndex: getWaveIndex(state.level),
        baseCount,
    })

    const composition = createWaveComposition(
        difficulty.count,
        difficulty.zoneIndex,
        difficulty.waveIndex,
        Math.random,
        {
            adaptation: getCompositionAdaptation(),
        }
    )

    startScheduledWave(difficulty, composition)

    startState.asteroidsRemaining = getRemainingAsteroidCount()
}

export function skipWave() {
    if (!import.meta.env.DEV) return

    resetWaveScheduler()

    // Snapshot avoids iterator mutation problems.
    for (const id of [...activeAsteroids]) {
        despawnAsteroid(id)
    }

    for (const id of [...bossQuery()]) {
        removeEntity(world, id)
    }

    startState.asteroidsRemaining = 0
    startState.encounterPhase = "completed"

    useGameStore.getState().completeLevel()
}

export function resetWaveSystem() {
    resetWaveScheduler()
    encounterSpawned = false
}