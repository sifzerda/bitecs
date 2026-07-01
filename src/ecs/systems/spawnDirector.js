// src/ecs/systems/spawnDirector.js

import { world } from "../constants/world"
import { asteroidQuery, ufoQuery } from "../constants/queries"
import { spawnAsteroid } from "../spawn"
import { spawnUfo } from "../spawnUfo"
import { gameStats } from "../../state/gameStats"
import { Velocity, Health, UfoHealth } from "../components"
import { progressionState, isBossWave, bossSpawned } from "../../progression/progressionState"
import { registerEnemySpawn, enemyDestroyed } from "../../progression/waveManager"

let spawnTimer = 0
const spawnRadius = 16

const MIN_INTERVAL = 0.20
const MAX_INTERVAL = 2.0

const BASE_MAX_ASTEROIDS = 8
const MAX_ASTEROIDS_PER_DIFFICULTY = 1.2
const ABSOLUTE_MAX_ASTEROIDS = 40




export function spawnDirectorSystem() {
    const dt = world.time.delta
    const difficulty = progressionState.difficulty
    const wave = progressionState.wave

    //-------------------------------------------------
    // Boss wave check
    //-------------------------------------------------

    const bossWave = isBossWave()

    if (bossWave && !progressionState.bossSpawnedThisWave) {
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

    if (spawnTimer <= 0) {

        spawnTimer = difficulty.spawnInterval

        const burst = difficulty.burst

        const wave = progressionState.wave

        for (let i = 0; i < burst; i++) {
            if (wave.enemiesSpawned >= wave.enemyTarget) break
            spawnAtEdge()
        }
    }
}




function spawnAtEdge() {
    const angle = Math.random() * Math.PI * 2
    const x = Math.cos(angle) * spawnRadius
    const y = Math.sin(angle) * spawnRadius

    const id = spawnAsteroid(x, y)

    applyDifficultyToAsteroid(id)

    registerEnemySpawn()
}

function applyDifficultyToAsteroid(id) {

    const d = progressionState.difficulty

    Velocity.x[id] *= d.asteroidSpeed
    Velocity.y[id] *= d.asteroidSpeed

    Health.current[id] = d.asteroidHealth
    Health.max[id] = d.asteroidHealth
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

    const bossHealth = Math.round(80 * (1 + bossNumber * 0.6) * (1 + difficulty * 0.04))

    UfoHealth.current[id] = bossHealth
    UfoHealth.max[id] = bossHealth
}
