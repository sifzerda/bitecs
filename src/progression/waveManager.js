// src/progression/waveManager.js

import { progressionState } from "./progressionState"
import { bossSchedule } from "../bosses/bossSchedule"
import { getBoss } from "../bosses/bossRegistry"
import { spawnAsteroid } from "../ecs/spawn"

const ASTEROID_RADIUS = 16
const BOSS_RADIUS = 6

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

function hasBoss() {
    return bossSchedule[progressionState.wave] !== undefined
}

function spawnBoss() {
    const bossId = bossSchedule[progressionState.wave]
    const boss = getBoss(bossId)
    if (!boss) return

    const angle = Math.random() * Math.PI * 2

    const x = Math.cos(angle) * BOSS_RADIUS
    const y = Math.sin(angle) * BOSS_RADIUS

    boss.spawn(x, y, progressionState.wave)

    progressionState.currentBoss = boss
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