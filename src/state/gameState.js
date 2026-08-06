// src/state/gameState.js
// sent to hud

export const SCREEN = {
    MENU: "menu",
    PLAY: "play",
    PAUSE: "pause",
    HOW_TO_PLAY: "how_to_play",
    SETTINGS: "settings",
    HIGHSCORES: "highscores",
    GUNS: "GUNS",
    STAGE_COMPLETE: "stage_complete",
    GAME_OVER: "game_over",
}

export const gameState = {

    // UI
    screen: SCREEN.MENU,
    // progression
    stage: 1,
    wave: 0,
    // player
    score: 0,
    lives: 3,
    health: 100,
    // weapons
    currentWeapon: 0,
    // unlocked weapons
    unlockedWeapons: [0],  // starting weapon
    // newly unlocked weapon after boss
    pendingUnlockWeapon: null,

    // boss
    bossAlive: false,
    bossDone: false,

    asteroidsRemaining: 0,

    paused: false,

    boostCooldown: 0,
    boostActive: 0,

    deflectBufferTime: 0,
    deflectFlashTimer: 0,
    deflectFlashX: 0,
    deflectFlashY: 0,

    gunSkinOverride: null

    //    tentaclesEnabled: false,
    //    octopusEnabled: true,
}

/*
 * gameState is a module-level singleton — it persists for the lifetime
 * of the page across every screen transition. Two independent things
 * were previously NOT resetting it between games:
 *
 *   1. Home.jsx's "enter play" effect only called spawnPlayer(), never
 *      touching wave/bossAlive/bossDone/asteroidsRemaining/score/lives.
 *   2. GameOverScreen didn't reset anything beyond `lives` before
 *      returning to the menu.
 *
 * A stale `wave` left at a multiple of 3 (with bossDone true) from a
 * previous session could satisfy waveSystem's boss-spawn condition on
 * the very first tick of a "new" game — appearing as a boss on wave 1.
 *
 * Call this on any transition that starts a genuinely fresh run:
 * Menu → Play, Game Over → Restart, Game Over → Menu.
 */
export function resetRun() {
    gameState.stage = 1
    gameState.wave = 0

    gameState.score = 0
    gameState.lives = 3
    gameState.health = 100

    gameState.currentWeapon = 0
    gameState.unlockedWeapons = [0]
    gameState.pendingUnlockWeapon = null

    gameState.bossAlive = false
    gameState.bossDone = false
    gameState.asteroidsRemaining = 0

    gameState.paused = false

    gameState.boostCooldown = 0
    gameState.boostActive = 0

    gameState.deflectBufferTime = 0
    gameState.deflectFlashTimer = 0
    gameState.deflectFlashX = 0
    gameState.deflectFlashY = 0

    gameState.gunSkinOverride = null
}

/*
 * Stage Complete → (equip a gun on GunsScreen) → next stage.
 */
export function advanceStage() {
    gameState.stage += 1
    gameState.wave = 0

    gameState.bossAlive = false
    gameState.bossDone = false
    gameState.asteroidsRemaining = 0

    gameState.pendingUnlockWeapon = null
    gameState.paused = false
}