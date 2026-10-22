// src/state/startState.js

export const startState = {

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
}

// ============================================================
// DEFAULT WEAPON
//
// Weapon 0 is the raygun and is always unlocked.
// A new run always starts with it equipped.
// ============================================================

export const DEFAULT_WEAPON = 0

// ============================================================
// RESET RUN
//
// Resets temporary run state.
//
// IMPORTANT:
// Weapon progression (unlocks) is persistent and belongs to
// gameStore. The EQUIPPED weapon, however, is reset to the
// default so every new game starts with the raygun.
// ============================================================

export function resetstartState() {

    startState.score = 0
    startState.lives = 3
    startState.health = 100

    startState.currentWeapon = DEFAULT_WEAPON

    resetstartStateForLevel()
}

// ============================================================
// RESET LEVEL
//
// Clears everything that belongs to the current encounter.
// Does NOT touch the equipped weapon, so it carries between
// levels.
// ============================================================

export function resetstartStateForLevel() {

    startState.asteroidsRemaining = 0

    startState.deflectBufferTime = 0
    startState.deflectFlashTimer = 0
    startState.deflectFlashX = 0
    startState.deflectFlashY = 0

    startState.gunSkinOverride = null

}