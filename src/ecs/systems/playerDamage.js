// src/ecs/systems/playerDamage.js

import {
    Health,
    Position,
    Invulnerability,
    StatusEffect,
} from "../constants/components.js"

import { startState } from "../../state/startState.js"

import {
    useGameStore,
    SCREEN,
} from "../../../store/gameStore.js"

import {
    PLAYER_INVULNERABILITY_DURATION,
} from "./invulnerabilitySystem.js"

import {
    emitPlayerDeathDebris,
} from "./entityDeath.js"

import {
    breakCombatCombo,
} from "../combat/combatScoring.js"

// ============================================================
// PLAYER DAMAGE
// ============================================================

// Periodic damage does not grant a fresh immunity
// window every simulation tick.
export function damagePlayer(
    id,
    amount,
    { periodic = false } = {}
) {
    const state = useGameStore.getState()

    // --------------------------------------------------------
    // VALIDATE DAMAGE
    // --------------------------------------------------------

    if (
        state.screen !== SCREEN.PLAY ||
        state.paused ||
        startState.encounterPhase !== "active" ||
        Invulnerability.remaining[id] > 0 ||
        Health.current[id] <= 0 ||
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        return false
    }

    // --------------------------------------------------------
    // APPLY DAMAGE
    // --------------------------------------------------------

    const previousHealth = Health.current[id]

    Health.current[id] = Math.max(
        0,
        previousHealth - amount
    )

    // Break the combo only when health was reduced.
    if (Health.current[id] < previousHealth) {
        breakCombatCombo()
    }

    // --------------------------------------------------------
    // INVULNERABILITY
    // --------------------------------------------------------

    if (!periodic) {
        Invulnerability.remaining[id] =
            PLAYER_INVULNERABILITY_DURATION
    }

    // --------------------------------------------------------
    // PLAYER DEATH
    // --------------------------------------------------------

    if (Health.current[id] === 0) {
        startState.lives = Math.max(
            0,
            startState.lives - 1
        )

        emitPlayerDeathDebris(
            Position.x[id],
            Position.y[id]
        )

        // Clear active status effects.
        StatusEffect.frozen[id] = 0
        StatusEffect.corrosionRemaining[id] = 0
        StatusEffect.corrosionDamage[id] = 0

        // Game over.
        if (startState.lives === 0) {
            startState.health = 0

            state.gameOver()

            return true
        }

        // Restore health for the next life.
        Health.current[id] = Health.max[id]

        Invulnerability.remaining[id] =
            PLAYER_INVULNERABILITY_DURATION
    }

    // --------------------------------------------------------
    // SYNCHRONIZE HUD HEALTH
    // --------------------------------------------------------

    startState.health = Health.current[id]

    return true
}
