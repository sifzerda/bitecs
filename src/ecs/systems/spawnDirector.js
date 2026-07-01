// src/ecs/systems/spawnDirector.js

import { world } from "../constants/world"
import { asteroidQuery, ufoQuery } from "../constants/queries"
import { spawnAsteroid } from "../spawn"
import { spawnUfo } from "../spawnUfo"
import { gameStats } from "../../state/gameStats"
import { Velocity, Health, UfoHealth } from "../components"
import { progressionState, isBossWave, bossSpawned } from "../../progression/progressionState"

let spawnTimer = 0
const spawnRadius = 16

const MIN_INTERVAL = 0.20
const MAX_INTERVAL = 2.0

const BASE_MAX_ASTEROIDS = 8
const MAX_ASTEROIDS_PER_DIFFICULTY = 1.2
const ABSOLUTE_MAX_ASTEROIDS = 40


export function spawnDirectorSystem() {
    const dt = world.time.delta
    const difficulty = progressionState.difficulty;
    const wave = progressionState.wave;

    //-------------------------------------------------
    // Boss wave check
    //-------------------------------------------------

    const bossWave = isBossWave()

    if (
        bossWave &&
        !progressionState.bossSpawnedThisWave
    ) {
        spawnBoss(wave, difficulty)
        bossSpawned()
        return
    }
    //-------------------------------------------------
    // Suppress normal spawning while a boss is alive
    //-------------------------------------------------

    if (ufoQuery().length > 0) return

    //-------------------------------------------------
    // Normal spawning
    //-------------------------------------------------

    spawnTimer -= dt

    const cap = Math.min(
        ABSOLUTE_MAX_ASTEROIDS,
        BASE_MAX_ASTEROIDS + difficulty * MAX_ASTEROIDS_PER_DIFFICULTY
    )

    const currentCount = asteroidQuery().length

    if (spawnTimer <= 0 && currentCount < cap) {
        spawnTimer = getSpawnInterval(difficulty)

        const burst = getSpawnBurst(difficulty)

        for (let i = 0; i < burst && currentCount + i < cap; i++) {
            spawnAtEdge(difficulty)
        }
    }
}

function getSpawnInterval(difficulty) {
    const t = Math.min(difficulty / 20, 1)
    const interval = MAX_INTERVAL - (MAX_INTERVAL - MIN_INTERVAL) * t
    const jitter = interval * 0.25
    return interval + (Math.random() * jitter - jitter / 2)
}

function getSpawnBurst(difficulty) {
    if (difficulty >= 14) return Math.random() < 0.5 ? 3 : 2
    if (difficulty >= 8) return Math.random() < 0.5 ? 2 : 1
    return 1
}

function spawnAtEdge(difficulty) {
    const angle = Math.random() * Math.PI * 2
    const x = Math.cos(angle) * spawnRadius
    const y = Math.sin(angle) * spawnRadius

    const id = spawnAsteroid(x, y)
    applyDifficultyToAsteroid(id, difficulty)
}

function applyDifficultyToAsteroid(id, difficulty) {
    const speedMultiplier = 1 + Math.min(difficulty, 20) * 0.06
    Velocity.x[id] *= speedMultiplier
    Velocity.y[id] *= speedMultiplier

    const inwardX = -Math.sign(Velocity.x[id] || (Math.random() - 0.5))
    const inwardY = -Math.sign(Velocity.y[id] || (Math.random() - 0.5))
    Velocity.x[id] += inwardX * 0.4
    Velocity.y[id] += inwardY * 0.4

    const healthMultiplier = 1 + Math.min(difficulty, 20) * 0.04
    const scaledHealth = Math.round(20 * healthMultiplier)
    Health.current[id] = scaledHealth
    Health.max[id] = scaledHealth
}

//-------------------------------------------------
// Boss spawn — now a UFO, not an asteroid
//-------------------------------------------------

function spawnBoss(wave, difficulty) {

    const bossNumber = wave / progressionState.bossWaveInterval

    const angle = Math.random() * Math.PI * 2

    const x = Math.cos(angle) * (spawnRadius * 0.6)
    const y = Math.sin(angle) * (spawnRadius * 0.6)

    const id = spawnUfo(x, y)

    const bossHealth =
        Math.round(
            80 *
            (1 + bossNumber * 0.6) *
            (1 + difficulty * 0.04)
        )

    UfoHealth.current[id] = bossHealth
    UfoHealth.max[id] = bossHealth
}
