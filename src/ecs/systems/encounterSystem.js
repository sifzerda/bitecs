// src/ecs/systems/encounterSystem.js

import { startState } from "../../state/startState.js"

import {
    useGameStore,
    SCREEN,
} from "../../../store/gameStore.js"

import { bossQuery } from "../constants/queries.js"

import {
    getRemainingAsteroidCount,
} from "../waves/waveState.js"

const CLEAR_DURATION = 1.2

function encounterIsEmpty() {
    return (
        getRemainingAsteroidCount() === 0 &&
        bossQuery().length === 0
    )
}

export function beginEncounterClear() {
    const state = useGameStore.getState()

    if (
        state.screen !== SCREEN.PLAY ||
        startState.encounterPhase !== "active" ||
        !encounterIsEmpty()
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

    if (!encounterIsEmpty()) {
        startState.encounterPhase = "active"
        startState.clearTimer = 0
        return
    }

    const delta = Number.isFinite(dt)
        ? Math.max(0, dt)
        : 0

    startState.clearTimer = Math.max(
        0,
        startState.clearTimer - delta
    )

    if (startState.clearTimer > 0) return

    startState.encounterPhase = "completed"

    useGameStore.getState().completeLevel()
}
