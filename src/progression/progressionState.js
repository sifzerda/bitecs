// src/progression/progressionState.js

export const progressionState = {

    //---------------------------------------
    // Stage Progression
    //---------------------------------------

    stage: 1,
    wave: 1,
    bossWaveInterval: 5,

    //---------------------------------------
    // Boss State
    //---------------------------------------

    bossAlive: false,
    bossSpawnedThisWave: false,
    bossDefeated: false,

    //---------------------------------------
    // Weapon Rewards
    //---------------------------------------

    pendingWeaponUnlock: null,

    //---------------------------------------
    // Difficulty
    //---------------------------------------

    difficulty: 1,

    //---------------------------------------
    // Statistics
    //---------------------------------------

    totalBossesKilled: 0

}