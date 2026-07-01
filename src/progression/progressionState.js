// src/progression/progressionState.js

export const progressionState = {

    //----------------------------------
    // Progression
    //----------------------------------

    stage: 1,
    wave: 1,
    difficulty: 1,

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
    return progressionState.wave % progressionState.bossWaveInterval === 0
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

    progressionState.wave++
    progressionState.bossSpawnedThisWave = false
    progressionState.bossDefeated = false

}

export function increaseDifficulty(amount = 1) {

    progressionState.difficulty += amount

}