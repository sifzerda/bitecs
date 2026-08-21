// src/state/simState.js

export const simState = {

    // ============================================================
    // RUN STATE
    // ============================================================

    score: 0,
    lives: 3,
    health: 100,

    // ============================================================
    // WEAPON STATE
    //
    // These are synchronized from gameStore.
    // gameStore is the persistent source of truth.
    // ============================================================

    currentWeapon: 0,
    unlockedWeapons: [0],

    // ============================================================
    // ENCOUNTER STATE
    // ============================================================

    asteroidsRemaining: 0,

    // ============================================================
    // DEFLECT STATE
    // ============================================================

    deflectBufferTime: 0,
    deflectFlashTimer: 0,
    deflectFlashX: 0,
    deflectFlashY: 0,

    // ============================================================
    // VISUAL / GAMEPLAY OVERRIDES
    // ============================================================

    gunSkinOverride: null,

    tentaclesEnabled: true,
    octopusEnabled: true,
}


// ============================================================
// RESET RUN
//
// Resets temporary run state.
//
// IMPORTANT:
// Weapon progression is persistent and belongs to gameStore.
// ============================================================

export function resetSimState() {

    simState.score = 0
    simState.lives = 3
    simState.health = 100

    resetSimStateForLevel()
}


// ============================================================
// RESET LEVEL
//
// Clears everything that belongs to the current encounter.
// ============================================================

export function resetSimStateForLevel() {

    simState.asteroidsRemaining = 0

    simState.deflectBufferTime = 0
    simState.deflectFlashTimer = 0
    simState.deflectFlashX = 0
    simState.deflectFlashY = 0

    simState.gunSkinOverride = null

    simState.tentaclesEnabled = true
    simState.octopusEnabled = true
}