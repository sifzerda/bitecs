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

    deflectBufferTime: 0,
    deflectFlashTimer: 0,
    deflectFlashX: 0,
    deflectFlashY: 0,

    gunSkinOverride: null

    //    tentaclesEnabled: false,
    //    octopusEnabled: true,
}

/*
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