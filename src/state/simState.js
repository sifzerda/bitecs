// src/state/simState.js

export const simState = {
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
  simState.score = 0
  simState.lives = 3
  simState.health = 100
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

/** Fresh spawn state for a level (start or continue). */
export function resetSimStateForLevel() {
  simState.bossAlive = false
  simState.bossDone = false
  simState.asteroidsRemaining = 0
  simState.pendingUnlockWeapon = null
}