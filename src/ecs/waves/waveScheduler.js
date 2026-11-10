// src/ecs/waves/waveScheduler.js

import { Position, Asteroid } from "../constants/components.js"
import { playerQuery } from "../constants/queries.js"
import { ASTEROID_TYPE } from "../asteroids/asteroidTypes.js"

import {
    activeAsteroids,
    spawnAsteroid,
} from "../asteroids/AsteroidManager.js"

import {
    createFormationPositions,
    chooseFormation,
} from "../difficulty/spawnFormations.js"

import { getSpawnPacing } from "../difficulty/spawnPacing.js"

import {
    createAdaptivePacingState,
    recordAdaptiveKill,
    updateAdaptivePacing,
    getAdaptivePacing,
} from "../difficulty/adaptivePacing.js"

import {
    getPendingWave,
    setPendingWave,
    clearPendingWave,
    getRemainingAsteroidCount,
} from "./waveState.js"

import {
    addSpawnWarnings,
    clearSpawnWarnings,
} from "./spawnWarningState.js"

import { startState } from "../../state/startState.js"

import {
    updateCompositionAdaptation,
} from "../difficulty/compositionAdaptation.js"

const RETRY_DELAY = 0.1
const POOL_CAPACITY = 128
const WARNING_DURATION = 0.75
const MAX_SPAWNS_PER_UPDATE = 8

function finishWaveComposition(wave) {
    const averagePressure =
        wave.pressureSamples > 0
            ? wave.pressureTotal / wave.pressureSamples
            : 0.5

    updateCompositionAdaptation({
        killRate: wave.adaptive.killRate,
        averagePressure,
        duration: wave.duration,
    })
}

const clamp = (value, min, max) =>
    Math.max(min, Math.min(max, value))

function syncRemaining() {
    startState.asteroidsRemaining =
        getRemainingAsteroidCount()
}

function getPlayerPosition() {
    const id = playerQuery()[0]

    return id === undefined
        ? { x: 0, y: 0 }
        : {
            x: Position.x[id],
            y: Position.y[id],
        }
}

function countActiveSplitters() {
    let count = 0

    for (const id of activeAsteroids) {
        if (
            Asteroid.active[id] === 1 &&
            Asteroid.type[id] === ASTEROID_TYPE.SPLITTER
        ) {
            count++
        }
    }

    return count
}

function findEligibleIndex(wave) {
    if (
        countActiveSplitters() <
        wave.pacing.maxSplitters
    ) {
        return wave.queue.length > 0 ? 0 : -1
    }

    return wave.queue.findIndex(
        (type) => type !== ASTEROID_TYPE.SPLITTER
    )
}

function activeLimit(wave) {
    return Math.max(
        1,
        Math.min(
            wave.pacing.maxActive,
            POOL_CAPACITY - wave.pacing.poolReserve
        )
    )
}

function updatePressure(wave, dt) {
    updateAdaptivePacing(wave.adaptive, {
        dt,
        activeCount: activeAsteroids.length,
        maxActive: activeLimit(wave),
    })

    wave.currentPacing = getAdaptivePacing(
        wave.adaptive,
        wave.pacing
    )
}

function prepareGroup(wave) {
    const player = getPlayerPosition()

    const count = Math.min(
        wave.pacing.groupSize,
        wave.queue.length
    )

    if (count <= 0) return false

    wave.positions = createFormationPositions({
        count,
        formation: wave.formation,
        playerX: player.x,
        playerY: player.y,
    })

    wave.positionCursor = 0
    wave.groupRemaining = wave.positions.length
    wave.warningTimer = WARNING_DURATION
    wave.stage = "warning"

    addSpawnWarnings(wave.positions, WARNING_DURATION)

    return wave.groupRemaining > 0
}

function spawnNext(wave) {
    if (activeAsteroids.length >= activeLimit(wave)) {
        return false
    }

    const index = findEligibleIndex(wave)
    if (index < 0) return false

    const point = wave.positions[wave.positionCursor]
    if (!point) return false

    const player = getPlayerPosition()

    const angle = Math.atan2(
        player.y - point.y,
        player.x - point.x
    )

    const id = spawnAsteroid(point.x, point.y, {
        type: wave.queue[index],
        angle,
        difficulty: wave.difficulty,
    })

    if (id == null || id < 0) return false

    wave.queue.splice(index, 1)
    wave.positionCursor++
    wave.groupRemaining--
    wave.spawned++

    syncRemaining()

    return true
}

function beginWaiting(wave) {
    wave.stage = "waiting"
    wave.groupTimer = Math.max(
        0,
        wave.currentPacing.groupInterval
    )
}

export function recordWaveAsteroidKill(count = 1) {
    const wave = getPendingWave()

    if (!wave) return

    recordAdaptiveKill(wave.adaptive, count)
}

export function getWavePacingStats() {
    const wave = getPendingWave()

    if (!wave) return null

    return {
        stage: wave.stage,
        active: activeAsteroids.length,
        queued: wave.queue.length,
        spawned: wave.spawned,
        pressure: wave.currentPacing.pressure,
        killRate: wave.currentPacing.killRate,
        groupInterval: wave.currentPacing.groupInterval,
        spawnInterval: wave.currentPacing.spawnInterval,
    }
}

export function startScheduledWave(difficulty, composition) {
    clearSpawnWarnings()

    const pacing = getSpawnPacing(difficulty)
    const adaptive = createAdaptivePacingState()

    const wave = {
        difficulty,
        pacing,
        adaptive,

        currentPacing: getAdaptivePacing(adaptive, pacing),

        queue: [...composition],

        formation: chooseFormation(
            difficulty.zoneIndex,
            difficulty.waveIndex
        ),

        positions: [],
        positionCursor: 0,
        groupRemaining: 0,

        groupTimer: 0,
        spawnTimer: 0,
        warningTimer: 0,

        stage: "waiting",
        spawned: 0,

        duration: 0,
        pressureTotal: 0,
        pressureSamples: 0,
    }

    setPendingWave(wave)
    syncRemaining()

    // First group begins with its warning.
    prepareGroup(wave)
}

export function updateWaveScheduler(dt) {
    const wave = getPendingWave()
    if (!wave) return

    const delta = Number.isFinite(dt)
        ? Math.max(0, dt)
        : 0

    updatePressure(wave, delta)

    wave.duration += delta
    wave.pressureTotal += wave.currentPacing.pressure * delta
    wave.pressureSamples += delta

    if (wave.queue.length === 0) {
        finishWaveComposition(wave)
        clearPendingWave()
        syncRemaining()
        return
    }

    // --------------------------------------------------------
    // WAITING FOR THE NEXT GROUP
    // --------------------------------------------------------

    if (wave.stage === "waiting") {
        // Reduce remaining cooldown when the arena is empty.
        const acceleration =
            activeAsteroids.length === 0 ? 2 : 1

        wave.groupTimer = Math.max(
            0,
            wave.groupTimer - delta * acceleration
        )

        if (wave.groupTimer > 0) return

        if (!prepareGroup(wave)) return
    }

    // --------------------------------------------------------
    // SPAWN WARNING
    // --------------------------------------------------------

    if (wave.stage === "warning") {
        wave.warningTimer = Math.max(
            0,
            wave.warningTimer - delta
        )

        if (wave.warningTimer > 0) return

        wave.stage = "spawning"
        wave.spawnTimer = 0
    }

    // --------------------------------------------------------
    // STAGGERED SPAWNING
    // --------------------------------------------------------

    if (wave.stage !== "spawning") return

    wave.spawnTimer -= delta

    let attempts = 0

    while (
        wave.spawnTimer <= 0 &&
        wave.groupRemaining > 0 &&
        attempts < MAX_SPAWNS_PER_UPDATE
    ) {
        attempts++

        if (!spawnNext(wave)) {
            wave.spawnTimer = RETRY_DELAY
            break
        }

        // Use the current pressure for the next spawn.
        wave.spawnTimer += Math.max(
            0.01,
            wave.currentPacing.spawnInterval
        )

        if (wave.groupRemaining === 0) {
            beginWaiting(wave)
            break
        }
    }

    if (wave.queue.length === 0) {
        finishWaveComposition(wave)
        clearPendingWave()
    }

    syncRemaining()
}

export function resetWaveScheduler() {
    clearPendingWave()
    clearSpawnWarnings()
    syncRemaining()
}
