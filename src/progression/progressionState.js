// src/progression/progressionState.js

export const progressionState = {

    //----------------------------------
    // Progression
    //----------------------------------

    stage: 1,

    wave: {

        number: 1,
        active: false,
        completed: false,
        state: "SPAWNING",
        enemyTarget: 8,
        enemiesSpawned: 0,
        enemiesRemaining: 0
    },

    difficulty: {

    level: 1,
    asteroidHealth: 20,
    asteroidSpeed: 1,
    spawnInterval: 2,
    burst: 1,
    asteroidCap: 8

},

    bossWaveInterval: 5,

    //----------------------------------
    // Boss
    //----------------------------------

    bossAlive: false,
    bossSpawnedThisWave: false,
    bossDefeated: false,

    //----------------------------------
    // Rewards
    //----------------------------------

    pendingWeaponUnlock: null,

    //----------------------------------
    // Statistics
    //----------------------------------

    totalBossesKilled: 0
}

//-----------------------------------------------------
// Helpers
//-----------------------------------------------------

export function isBossWave() {
    return (
        progressionState.wave.number %
        progressionState.bossWaveInterval
    ) === 0
}

export function bossSpawned() {
    progressionState.bossAlive = true
    progressionState.bossSpawnedThisWave = true
}

export function bossKilled() {
    progressionState.bossAlive = false
    progressionState.bossDefeated = true
    progressionState.totalBossesKilled++
}

export function advanceWave() {

    progressionState.wave.number++

    progressionState.wave.active = false
    progressionState.wave.completed = false
    progressionState.wave.enemiesSpawned = 0
    progressionState.wave.enemiesRemaining = 0

    progressionState.bossSpawnedThisWave = false
    progressionState.bossDefeated = false

}

export function increaseDifficulty(amount = 1) {

    progressionState.difficulty += amount

}