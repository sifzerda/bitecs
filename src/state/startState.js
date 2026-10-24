// src/state/startState.js

export const DEFAULT_WEAPON = 0

export const startState = {
  score: 0,
  lives: 3,
  health: 100,

  currentWeapon: DEFAULT_WEAPON,
  unlockedWeapons: [DEFAULT_WEAPON],

  asteroidsRemaining: 0,

  // idle -> active -> clearing -> completed
  encounterPhase: "idle",
  clearTimer: 0,

  deflectBufferTime: 0,
  deflectCooldownTime: 0,

  deflectFlashTimer: 0,
  deflectFlashX: 0,
  deflectFlashY: 0,

  gunSkinOverride: null,
}

export function resetstartState() {
  startState.score = 0
  startState.lives = 3
  startState.health = 100
  startState.currentWeapon = DEFAULT_WEAPON

  resetstartStateForLevel()
}

export function resetstartStateForLevel() {
  startState.asteroidsRemaining = 0

  startState.encounterPhase = "idle"
  startState.clearTimer = 0

  startState.deflectBufferTime = 0
  startState.deflectCooldownTime = 0

  startState.deflectFlashTimer = 0
  startState.deflectFlashX = 0
  startState.deflectFlashY = 0

  startState.gunSkinOverride = null
}