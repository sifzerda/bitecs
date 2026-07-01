// src/progression/waveManager.js

import {
    progressionState,
    increaseDifficulty,
    isBossWave
} from "./progressionState"

import { spawnUfo } from "../ecs/spawnUfo"
import { UfoHealth } from "../ecs/components"
import { spawnAsteroid } from "../ecs/spawn" 

/*
-------------------------------------------------------
WAVE COMPLETION (ASTEROIDS DONE)
-------------------------------------------------------
*/

function completeWave() {
    const wave = progressionState.wave

    wave.state = "COMPLETE"
    increaseDifficulty()
}

/*
-------------------------------------------------------
MAIN SYSTEM
-------------------------------------------------------
*/

export function waveManagerSystem() {
    checkWaveComplete()
    checkBossTrigger()
    tryAdvanceWave()
}

/*
-------------------------------------------------------
STEP 1: MOVE FROM SPAWNING → CLEARING
-------------------------------------------------------
*/

function checkWaveComplete() {
    const wave = progressionState.wave

    if (
        wave.state === "SPAWNING" &&
        wave.enemiesSpawned >= wave.enemyTarget
    ) {
        wave.state = "CLEARING"
    }
}

/*
-------------------------------------------------------
STEP 2: SPAWN BOSS AT WAVE BOUNDARY
-------------------------------------------------------
*/

function checkBossTrigger() {
    const wave = progressionState.wave

    const bossWave = isBossWave()

    if (
        wave.state === "CLEARING" &&
        wave.enemiesRemaining === 0 &&
        bossWave &&
        !progressionState.bossSpawnedThisWave
    ) {
        spawnBossAtWaveBoundary()
        wave.state = "BOSS"
    }
}

/*
-------------------------------------------------------
STEP 3: MOVE TO NEXT WAVE
-------------------------------------------------------
*/

function tryAdvanceWave() {
    const wave = progressionState.wave

    if (wave.state === "COMPLETE") {
        beginWave()
    }
}

function spawnFullWave() {
    const wave = progressionState.wave
    const count = wave.enemyTarget

    for (let i = 0; i < count; i++) {
        spawnAsteroidAtWaveStart()
    }
}

/*
-------------------------------------------------------
WAVE START
-------------------------------------------------------
*/

export function beginWave() {
    const wave = progressionState.wave

    wave.state = "SPAWNING"
    wave.enemiesSpawned = 0
    wave.enemiesRemaining = 0

    wave.enemyTarget = getWaveTarget(wave.number)

    progressionState.bossSpawnedThisWave = false

    spawnFullWave()
}

function getWaveTarget(waveNumber) {
    return 6 + Math.floor(waveNumber * 1.5)
}

/*
-------------------------------------------------------
ENEMY TRACKING
-------------------------------------------------------
*/

export function registerEnemySpawn() {
    const wave = progressionState.wave

    if (wave.enemiesSpawned >= wave.enemyTarget) return

    wave.enemiesSpawned++
    wave.enemiesRemaining++
}

export function enemyDestroyed() {
  const wave = progressionState.wave
  // prevent underflow (THIS fixes negative / flicker issues)
  wave.enemiesRemaining = Math.max(0, wave.enemiesRemaining - 1)
}

/*
-------------------------------------------------------
BOSS SPAWN
-------------------------------------------------------
*/

function spawnBossAtWaveBoundary() {

    const wave = progressionState.wave
    const difficulty = progressionState.difficulty

    const angle = Math.random() * Math.PI * 2

    const x = Math.cos(angle) * 6
    const y = Math.sin(angle) * 6

    const id = spawnUfo(x, y)

    const bossHealth =
        80 * (1 + wave.number * 0.6) *
        (1 + difficulty.level * 0.1)

    UfoHealth.current[id] = bossHealth
    UfoHealth.max[id] = bossHealth

    progressionState.bossSpawnedThisWave = true
}

function spawnAsteroidAtWaveStart() {
    const angle = Math.random() * Math.PI * 2

    const x = Math.cos(angle) * 16
    const y = Math.sin(angle) * 16

    const id = spawnAsteroid(x, y)

    registerEnemySpawn()

    return id
}