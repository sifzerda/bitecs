// src/progression/progressionState.js

export const progressionState = {
    wave: 1,

    state: "STARTING", 
    // STARTING → CLEARING → BOSS → COMPLETE

    enemyTarget: 0,
    enemiesSpawned: 0,
    enemiesRemaining: 0,

    bossActive: false,
    currentBoss: null
}