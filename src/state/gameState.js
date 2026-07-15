// src/state/gameState.js
// sent to hud

export const gameState = {

    score: 0,
    lives: 3,
    currentWeapon: 0,
    paused: false,
    wave: 0,              // starts at 0, first asteroid wave becomes 1
    asteroidsRemaining: 0,
    
    bossAlive: false,
    bossDone: false,        // tracks whether this wave-cycle's boss already spawned

    boostCooldown: 0,   // seconds remaining until boost can fire again
    boostActive: 0,

    deflectBufferTime: 0,
    deflectFlashTimer: 0,
    deflectFlashX: 0,
    deflectFlashY: 0,

    gunSkinOverride: null

//    tentaclesEnabled: false,
//    octopusEnabled: true,
}