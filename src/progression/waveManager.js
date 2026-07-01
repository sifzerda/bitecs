// src/progression/waveManager.js

import { progressionState } from "./progressionState"
import { spawnWave } from "./waveSpawner"
import { spawnBossForWave } from "./spawnBoss"

export function waveManagerSystem() {

    const wave = progressionState.wave

    switch (wave.state) {

        case "SPAWNING":

            if (wave.enemiesSpawned >= wave.enemyTarget) {
                wave.state = "CLEARING"
            }

            break

        case "CLEARING":

            if (wave.enemiesRemaining > 0)
                break

            if (wave.number % 5 === 0) {

                wave.state = "BOSS"

                spawnBossForWave(wave.number)

            } else {

                finishWave()

            }

            break

        case "BOSS":

            if (wave.enemiesRemaining === 0) {

                finishWave()

            }

            break

        case "COMPLETE":

            beginWave()

            break

    }

}

function finishWave() {

    progressionState.wave.state = "COMPLETE"

}

export function beginWave() {

    const wave = progressionState.wave

    wave.number++

    wave.state = "SPAWNING"

    wave.enemiesSpawned = 0
    wave.enemiesRemaining = 0

    wave.enemyTarget = getWaveTarget(wave.number)

    spawnWave()

}

function getWaveTarget(wave) {

    return 6 + wave * 2

}

export function registerEnemySpawn() {

    const wave = progressionState.wave

    wave.enemiesSpawned++
    wave.enemiesRemaining++

}

export function enemyDestroyed() {

    const wave = progressionState.wave

    if (wave.enemiesRemaining > 0)
        wave.enemiesRemaining--

}