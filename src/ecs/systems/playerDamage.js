// src/ecs/systems/playerDamage.js

import { Health, Position, Invulnerability, StatusEffect } from "../constants/components.js"
import { startState } from "../../state/startState.js"
import { useGameStore, SCREEN } from "../../../store/gameStore.js"
import { PLAYER_INVULNERABILITY_DURATION } from "./invulnerabilitySystem.js"
import { emitPlayerDeathDebris } from "./entityDeath.js"
// Periodic damage does not grant a fresh immunity window every simulation tick.

export function damagePlayer(id, amount, { periodic = false } = {}) {

  const state = useGameStore.getState()

  if (state.screen !== SCREEN.PLAY || state.paused || startState.encounterPhase !== "active" || Invulnerability.remaining[id] > 0 || Health.current[id] <= 0 || !Number.isFinite(amount) || amount <= 0)
    return false
  
  Health.current[id] = Math.max(0, Health.current[id] - amount)

  if (!periodic) Invulnerability.remaining[id] = PLAYER_INVULNERABILITY_DURATION

  if (Health.current[id] === 0) {

    startState.lives = Math.max(0, startState.lives - 1)

    emitPlayerDeathDebris(Position.x[id], Position.y[id])
    StatusEffect.frozen[id] = StatusEffect.corrosionRemaining[id] = StatusEffect.corrosionDamage[id] = 0

    if (startState.lives === 0) {
      startState.health = 0; state.gameOver(); return true
    }
    Health.current[id] = Health.max[id]; Invulnerability.remaining[id] = PLAYER_INVULNERABILITY_DURATION
  }
  startState.health = Health.current[id]
  return true
}
