// src/state/simState.js

export const simState = {

    wave: 0,

    score: 0,
    lives: 3,
    health: 100,

    currentWeapon: 0,
    unlockedWeapons: [0],
    pendingUnlockWeapon: null,

    bossAlive: false,
    bossDone: false,
    asteroidsRemaining: 0,

    deflectBufferTime: 0,
    deflectFlashTimer: 0,
    deflectFlashX: 0,
    deflectFlashY: 0,

    gunSkinOverride: null,

    tentaclesEnabled: true,
    octopusEnabled: true,
}


export function resetSimState() {

    simState.wave = 0

    simState.score = 0
    simState.lives = 3
    simState.health = 100

    simState.currentWeapon = 0
    simState.unlockedWeapons = [0]
    simState.pendingUnlockWeapon = null

    simState.bossAlive = false
    simState.bossDone = false
    simState.asteroidsRemaining = 0

    simState.deflectBufferTime = 0
    simState.deflectFlashTimer = 0
    simState.deflectFlashX = 0
    simState.deflectFlashY = 0

    simState.gunSkinOverride = null

    simState.tentaclesEnabled = true
    simState.octopusEnabled = true
}


export function resetSimStateForLevel(section) {

    // A = 1, B = 2, C = 3
    //
    // waveSystem increments before spawning, so
    // start one wave before the requested wave.
    //
    // Boss = 4 -> wave 3, causing waveSystem to
    // immediately spawn the boss.

    simState.wave = section - 1

    simState.bossAlive = false
    simState.bossDone = false
    simState.asteroidsRemaining = 0
    simState.pendingUnlockWeapon = null
}


export function resetSimStateForAdvance() {

    simState.wave = 0

    simState.bossAlive = false
    simState.bossDone = false
    simState.asteroidsRemaining = 0
    simState.pendingUnlockWeapon = null
}