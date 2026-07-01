// src/progression/waveManager.js

import { progressionState, increaseDifficulty } from "./progressionState"

/*
-------------------------------------------------------
-------------------------------------------------------
*/

function completeWave() {
    const wave = progressionState.wave
    wave.active = false
    wave.completed = true
    wave.number++
    increaseDifficulty()
}

export function waveManagerSystem() {
    const wave = progressionState.wave
    if (wave.active && wave.enemiesRemaining <= 0 && wave.enemiesSpawned >= wave.enemyTarget) {
        completeWave()
    }
}

export function beginWave() {
    const wave = progressionState.wave
    wave.active = true
    wave.completed = false
    wave.enemiesSpawned = 0
    wave.enemiesRemaining = 0
}

export function registerEnemySpawn() {
    progressionState.wave.enemiesSpawned++
    progressionState.wave.enemiesRemaining++
}

export function enemyDestroyed() {
    progressionState.wave.enemiesRemaining--
}