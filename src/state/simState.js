// src/state/simState.js

export const simState = {
  score: 0,
  lives: 3,
  health: 100,

  currentWeapon: 0,
  unlockedWeapons: [0],
  pendingUnlockWeapon: null,

  // Wave / encounter state
  asteroidsRemaining: 0,
  bossDone: false,

  // Deflect state
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

  simState.currentWeapon = 0
  simState.unlockedWeapons = [0]
  simState.pendingUnlockWeapon = null

  simState.asteroidsRemaining = 0
  simState.bossDone = false

  simState.deflectBufferTime = 0
  simState.deflectFlashTimer = 0
  simState.deflectFlashX = 0
  simState.deflectFlashY = 0

  simState.gunSkinOverride = null
  simState.tentaclesEnabled = true
  simState.octopusEnabled = true
}

export function resetSimStateForLevel() {
  simState.asteroidsRemaining = 0
  simState.bossDone = false
  simState.pendingUnlockWeapon = null

  simState.deflectBufferTime = 0
  simState.deflectFlashTimer = 0
  simState.deflectFlashX = 0
  simState.deflectFlashY = 0
}