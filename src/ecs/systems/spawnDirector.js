// src/ecs/systems/spawnDirector.js

import { world } from "../constants/world"
import { asteroidQuery } from "../constants/queries"
import { spawnAsteroid } from "../spawn"
import { gameStats } from "../../state/gameStats"
import { Velocity, Health } from "../components"

const spawnRadius = 16
const MIN_INTERVAL = 0.20
const MAX_INTERVAL = 2.0
const BASE_MAX_ASTEROIDS = 8
const MAX_ASTEROIDS_PER_DIFFICULTY = 1.2
const ABSOLUTE_MAX_ASTEROIDS = 40
const BOSS_WAVE_INTERVAL = 5

let spawnTimer = 0
let lastBossWave = 0

export function spawnDirectorSystem() {
    const dt = world.time.delta
    const difficulty = gameStats.difficulty
    const wave = gameStats.wave

    //-------------------------------------------------
    // Boss wave check
    //
    // Triggers once, the moment the wave counter crosses
    // a multiple of BOSS_WAVE_INTERVAL.
    //-------------------------------------------------

    const isBossWave = wave % BOSS_WAVE_INTERVAL === 0

    if (isBossWave && wave !== lastBossWave) {
        lastBossWave = wave
        spawnBoss(wave, difficulty)
        // skip normal spawning this tick so the boss entrance reads clearly
        return
    }

    //-------------------------------------------------
    // Normal spawning (suppressed during an active boss wave
    // so the arena doesn't get cluttered mid-fight)
    //-------------------------------------------------

    if (isBossWave) return

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
// Boss spawn
//
// One large, tanky asteroid, scaled by how many boss
// waves have passed (wave 5 -> 1st boss, wave 10 -> 2nd, etc)
// Enters from a fixed edge so the player can brace for it.
//-------------------------------------------------

function spawnBoss(wave, difficulty) {
    const bossNumber = wave / BOSS_WAVE_INTERVAL

    const angle = Math.random() * Math.PI * 2
    const x = Math.cos(angle) * spawnRadius
    const y = Math.sin(angle) * spawnRadius

    const id = spawnAsteroid(x, y, true)

    // Slow and deliberate, not fast — it should feel like a wall, not a bullet
    const inwardX = -Math.sign(x)
    const inwardY = -Math.sign(y)
    Velocity.x[id] = inwardX * (1 + difficulty * 0.03)
    Velocity.y[id] = inwardY * (1 + difficulty * 0.03)

    // Health scales hard per boss encountered, on top of normal difficulty scaling
    const bossHealth = Math.round(20 * (4 + bossNumber * 2.5) * (1 + difficulty * 0.04))
    Health.current[id] = bossHealth
    Health.max[id] = bossHealth
}