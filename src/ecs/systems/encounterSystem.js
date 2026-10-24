// src/ecs/systems/encounterSystem.js

import { startState } from "../../state/startState.js"

import {
  useGameStore,
  SCREEN,
} from "../../../store/gameStore.js"

const CLEAR_DURATION = 1.2

export function beginEncounterClear() {
  
  const { screen } = useGameStore.getState()

  if (
    screen !== SCREEN.PLAY || startState.encounterPhase !== "active"
  ) {
    return false
  }

  startState.encounterPhase = "clearing"
  startState.clearTimer = CLEAR_DURATION
  startState.deflectBufferTime = 0

  return true
}

export function encounterSystem(dt) {
  if (startState.encounterPhase !== "clearing") {
    return
  }

  startState.clearTimer = Math.max(0, startState.clearTimer - dt)

  if (startState.clearTimer > 0) return

  // Mark completed before changing screens.
  startState.encounterPhase = "completed"

  useGameStore.getState().completeLevel()
}