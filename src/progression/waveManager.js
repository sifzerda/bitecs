// src/progression/waveManager.js

import { progressionState } from "./progressionState"
import { spawnAsteroid } from "../ecs/spawn"

const ASTEROID_RADIUS = 16

export function waveManagerSystem() {
    switch (progressionState.state) {

        case "STARTING":
            startWave()
            break

        case "CLEARING":
            if (progressionState.enemiesRemaining > 0) return

            else {
                finishWave()
            }
            break

        case "COMPLETE":
            progressionState.wave++
            progressionState.state = "STARTING"
            break
    }
}

function startWave() {
    progressionState.enemiesRemaining = 0
    progressionState.enemiesSpawned = 0

    const count = getEnemyTarget()
    progressionState.enemyTarget = count

    for (let i = 0; i < count; i++) {
        spawnAsteroidAtRandom()
    }

    progressionState.state = "CLEARING"
}

function spawnAsteroidAtRandom() {
    const angle = Math.random() * Math.PI * 2

    const x = Math.cos(angle) * ASTEROID_RADIUS
    const y = Math.sin(angle) * ASTEROID_RADIUS

    spawnAsteroid(x, y)

    registerEnemySpawn()
}



function finishWave() {
    progressionState.state = "COMPLETE"
}

function getEnemyTarget() {
    return 6 + progressionState.wave * 2
}

export function registerEnemySpawn() {
    progressionState.enemiesSpawned++
    progressionState.enemiesRemaining++
}

export function enemyDestroyed() {
    progressionState.enemiesRemaining =
        Math.max(0, progressionState.enemiesRemaining - 1)
}

export function beginWave() {
    progressionState.state = "STARTING"
    progressionState.currentBoss = null
}