// src/progression/waveManager.js

import { progressionState } from "./progressionState"
import { bossRegistry } from "./bossRegistry"
import { bossSchedule } from "./bossSchedule"

import { spawnAsteroid } from "../ecs/spawn"

const ASTEROID_SPAWN_RADIUS = 16
const BOSS_SPAWN_RADIUS = 6

//--------------------------------------------------
// Main system
//--------------------------------------------------

export function waveManagerSystem() {

    switch (progressionState.state) {

        //------------------------------------------
        // Start a brand new wave
        //------------------------------------------

        case "STARTING":

            startWave()

            break

        //------------------------------------------
        // Waiting for asteroids to die
        //------------------------------------------

        case "CLEARING":

            if (progressionState.enemiesRemaining > 0)
                return

            if (hasBossWave()) {

                spawnBoss()

                progressionState.state = "BOSS"

            }
            else {

                finishWave()

            }

            break

        //------------------------------------------
        // Waiting for boss death
        //------------------------------------------

        case "BOSS":

            if (progressionState.enemiesRemaining > 0)
                return

            finishWave()

            break

        //------------------------------------------
        // Advance
        //------------------------------------------

        case "COMPLETE":

            progressionState.wave++

            progressionState.state = "STARTING"

            break

    }

}

//--------------------------------------------------
// Start Wave
//--------------------------------------------------

function startWave() {

    progressionState.enemyTarget = getEnemyTarget()

    progressionState.enemiesSpawned = 0
    progressionState.enemiesRemaining = 0
    progressionState.bossActive = false

    spawnAsteroidWave()

    progressionState.state = "CLEARING"

}

//--------------------------------------------------
// Spawn asteroid wave
//--------------------------------------------------

function spawnAsteroidWave() {

    for (let i = 0; i < progressionState.enemyTarget; i++) {

        const angle = Math.random() * Math.PI * 2

        const x = Math.cos(angle) * ASTEROID_SPAWN_RADIUS
        const y = Math.sin(angle) * ASTEROID_SPAWN_RADIUS

        spawnAsteroid(x, y)

        registerEnemySpawn()

    }

}

//--------------------------------------------------
// Boss?
//--------------------------------------------------

function hasBossWave() {

    return bossSchedule[progressionState.wave] !== undefined

}

//--------------------------------------------------
// Spawn boss
//--------------------------------------------------

function spawnBoss() {

    const bossId = bossSchedule[progressionState.wave]

    if (!bossId)
        return

    const boss = bossRegistry[bossId]

    if (!boss)
        return

    const angle = Math.random() * Math.PI * 2

    const x = Math.cos(angle) * BOSS_SPAWN_RADIUS
    const y = Math.sin(angle) * BOSS_SPAWN_RADIUS

    boss.spawn(x, y, progressionState.wave)

    progressionState.bossActive = true

    registerEnemySpawn()

}

//--------------------------------------------------
// Finish
//--------------------------------------------------

function finishWave() {

    progressionState.state = "COMPLETE"

}

//--------------------------------------------------
// Enemy scaling
//--------------------------------------------------

function getEnemyTarget() {

    return 6 + progressionState.wave * 2

}

//--------------------------------------------------
// Tracking
//--------------------------------------------------

export function registerEnemySpawn() {

    progressionState.enemiesSpawned++
    progressionState.enemiesRemaining++

}

export function enemyDestroyed() {

    progressionState.enemiesRemaining = Math.max(
        0,
        progressionState.enemiesRemaining - 1
    )

}