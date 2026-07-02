// src/state/gameStats.js
// sent to hud

export const gameStats = {

    score: 0,
    lives: 3,
    paused: false,
    wave: 0,              // starts at 0, first asteroid wave becomes 1
    asteroidsRemaining: 0,
    
    bossAlive: false,
    bossDone: false,        // tracks whether this wave-cycle's boss already spawned

    boostCooldown: 0,   // seconds remaining until boost can fire again
    boostActive: 0
}