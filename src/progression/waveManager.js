// src/progression/waveManager.js

import { progressionState } from "./progressionState"
import { bossSchedule } from "../bosses/bossSchedule"
import { getBoss } from "../bosses/bossRegistry"
import { spawnAsteroid } from "../ecs/spawn"

const ASTEROID_SPAWN_RADIUS = 16
const BOSS_SPAWN_RADIUS = 6

//--------------------------------------------------
// MAIN SYSTEM
//--------------------------------------------------

export function waveManagerSystem() {
    switch (progressionState.state) {

        case "STARTING":
            startWave()
            break

        case "CLEARING":
            if (progressionState.enemiesRemaining > 0) return

            if (hasBoss()) {
                spawnBoss()
                progressionState.state = "BOSS"
            } else {
                finishWave()
            }
            break

        case "BOSS":
            if (progressionState.currentBoss?.isAlive?.()) return
            finishWave()
            break

        case "COMPLETE":
            progressionState.wave++
            progressionState.state = "STARTING"
            break
    }
}

//--------------------------------------------------
// WAVE START
//--------------------------------------------------

export function beginWave() {
    progressionState.state = "STARTING"
}

function startWave() {
    progressionState.enemyTarget = getEnemyTarget()

    progressionState.enemiesSpawned = 0
    progressionState.enemiesRemaining = 0

    progressionState.bossActive = false
    progressionState.currentBoss = null

    spawnWave()
    progressionState.state = "CLEARING"
}

//--------------------------------------------------
// ASTEROID SPAWNING
//--------------------------------------------------

function spawnWave() {
    const count = progressionState.enemyTarget

    for (let i = 0; i < count; i++) {
        spawnAsteroidAtRandom()
    }
}

function spawnAsteroidAtRandom() {
    const angle = Math.random() * Math.PI * 2

    const x = Math.cos(angle) * ASTEROID_SPAWN_RADIUS
    const y = Math.sin(angle) * ASTEROID_SPAWN_RADIUS

    spawnAsteroid(x, y)
    registerEnemySpawn()
}

//--------------------------------------------------
// BOSS SYSTEM (EVERY 5 WAVES)
//--------------------------------------------------

function hasBoss() {
    return progressionState.wave % 5 === 0
}

function spawnBoss() {
    const boss = getBoss(progressionState.wave)
    if (!boss) return

    const angle = Math.random() * Math.PI * 2

    const x = Math.cos(angle) * BOSS_SPAWN_RADIUS
    const y = Math.sin(angle) * BOSS_SPAWN_RADIUS

    const entity = boss.spawn(x, y, progressionState.wave)

    progressionState.currentBoss = boss
    progressionState.bossActive = true

    registerEnemySpawn()
}

//--------------------------------------------------
// FINISH WAVE
//--------------------------------------------------

function finishWave() {
    progressionState.state = "COMPLETE"
}

//--------------------------------------------------
// TRACKING
//--------------------------------------------------

export function registerEnemySpawn() {
    progressionState.enemiesSpawned++
    progressionState.enemiesRemaining++
}

export function enemyDestroyed() {
    progressionState.enemiesRemaining =
        Math.max(0, progressionState.enemiesRemaining - 1)
}

//--------------------------------------------------
// SCALE
//--------------------------------------------------

function getEnemyTarget() {
    return 6 + progressionState.wave * 2
}