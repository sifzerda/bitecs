// src/progression/waveManager.js

import { progressionState, increaseDifficulty } from "./progressionState"

    const wave = progressionState.wave

function completeWave() {



    wave.active = false
    wave.completed = true

    progressionState.wave.number++

    increaseDifficulty()
}

export function waveManagerSystem() {

    const wave = progressionState.wave

    if (
        wave.active &&
        wave.enemiesRemaining <= 0 &&
        wave.enemiesSpawned >= wave.enemyTarget
    ) {
        completeWave()
    }

}

export function beginWave() {


    wave.active = true
    wave.completed = false
    wave.enemiesSpawned = 0
    wave.enemiesRemaining = 0

}

if (wave.active && wave.enemiesRemaining == 0 && wave.enemiesSpawned >= wave.enemyTarget) {
    completeWave()
}




export function registerEnemySpawn(){
    progressionState.wave.enemiesSpawned++
    progressionState.wave.enemiesRemaining++
}

export function enemyDestroyed(){

    progressionState.wave.enemiesRemaining--

}