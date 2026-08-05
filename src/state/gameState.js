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
    
    BOSS_GALLERY: "boss_gallery"
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
    pendingWeaponUnlock: null,

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