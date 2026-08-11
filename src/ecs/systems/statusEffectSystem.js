// src/ecs/systems/statusEffectSystem.js

import { world } from "../constants/world.js"

import {
    StatusEffect,
    Health,
    Position,
} from "../constants/components.js"

import {
    playerQuery,
    bossQuery,
} from "../constants/queries.js"

import { activeAsteroids } from "../pools/asteroidPool.js"

import {
    killAsteroid,
    killBoss,
} from "./entityDeath.js"

import {
    gameState,
    SCREEN,
} from "../../state/gameState.js"

import { notifyUIChanged } from "../../state/uiState.js"


// ============================================================
// Apply / refresh status effects
// ============================================================

export function applyStatusEffects(targetId, weapon) {

    // --------------------------------------------------------
    // Corrosion
    // --------------------------------------------------------

    if (
        weapon.corrosion && weapon.corrosionDamage > 0 && weapon.corrosionDuration > 0
    ) {
        StatusEffect.corrosionDamage[targetId] = weapon.corrosionDamage
        // Refresh duration when hit again.
        StatusEffect.corrosionRemaining[targetId] = weapon.corrosionDuration
    }

    // --------------------------------------------------------
    // Freeze
    // --------------------------------------------------------

    if (
        weapon.freezeDuration && weapon.freezeDuration > 0
    ) {
        StatusEffect.frozen[targetId] = weapon.freezeDuration
    }
}

// ============================================================
// Update status effects
// ============================================================

export function statusEffectSystem() {

    const dt = world.time.delta

    // ========================================================
    // Asteroids
    // ========================================================

    const asteroids = activeAsteroids

    for (let i = 0; i < asteroids.length; i++) {

        const id = asteroids[i]

        // ----------------------------------------------------
        // Freeze
        // ----------------------------------------------------

        if (StatusEffect.frozen[id] > 0) {

            StatusEffect.frozen[id] -= dt

            if (StatusEffect.frozen[id] < 0) {
                StatusEffect.frozen[id] = 0
            }
        }

        // ----------------------------------------------------
        // Corrosion
        // ----------------------------------------------------

        if (StatusEffect.corrosionRemaining[id] > 0) {

            const corrosionDPS = StatusEffect.corrosionDamage[id]
            // Damage every frame.
            Health.current[id] -= corrosionDPS * dt
            StatusEffect.corrosionRemaining[id] -= dt

            // ------------------------------------------------
            // Death
            // ------------------------------------------------

            if (Health.current[id] <= 0) {

                killAsteroid(id, Position.x[id], Position.y[id])

                continue
            }

            // ------------------------------------------------
            // Expired
            // ------------------------------------------------

            if (StatusEffect.corrosionRemaining[id] <= 0) {
                StatusEffect.corrosionRemaining[id] = 0
                StatusEffect.corrosionDamage[id] = 0
            }
        }
    }

    // ========================================================
    // Bosses
    // ========================================================

    const bosses = bossQuery()

    for (let i = 0; i < bosses.length; i++) {

        const id = bosses[i]

        // ----------------------------------------------------
        // Freeze
        // ----------------------------------------------------

        if (StatusEffect.frozen[id] > 0) {

            StatusEffect.frozen[id] -= dt

            if (StatusEffect.frozen[id] < 0) {
                StatusEffect.frozen[id] = 0
            }
        }

        // ----------------------------------------------------
        // Corrosion
        // ----------------------------------------------------

        if (StatusEffect.corrosionRemaining[id] > 0) {

            const corrosionDPS = StatusEffect.corrosionDamage[id]
            Health.current[id] -= corrosionDPS * dt
            StatusEffect.corrosionRemaining[id] -= dt

            // ------------------------------------------------
            // Death
            // ------------------------------------------------

            if (Health.current[id] <= 0) {

                killBoss(id, Position.x[id], Position.y[id])

                continue
            }


            // ------------------------------------------------
            // Expired
            // ------------------------------------------------

            if (StatusEffect.corrosionRemaining[id] <= 0) {

                StatusEffect.corrosionRemaining[id] = 0
                StatusEffect.corrosionDamage[id] = 0
            }
        }
    }


    // ========================================================
    // Player
    // ========================================================

    const players = playerQuery()

    if (players.length === 0) {
        return
    }

    const pid = players[0]


    // --------------------------------------------------------
    // Freeze
    // --------------------------------------------------------

    if (StatusEffect.frozen[pid] > 0) {

        StatusEffect.frozen[pid] -= dt

        if (StatusEffect.frozen[pid] < 0) {
            StatusEffect.frozen[pid] = 0
        }
    }

    // --------------------------------------------------------
    // Corrosion
    // --------------------------------------------------------

    if (StatusEffect.corrosionRemaining[pid] > 0) {

        const corrosionDPS = StatusEffect.corrosionDamage[pid]
        Health.current[pid] -= corrosionDPS * dt
        StatusEffect.corrosionRemaining[pid] -= dt
    }

    // --------------------------------------------------------
    // Player death
    // --------------------------------------------------------

    if (Health.current[pid] <= 0) {

        gameState.lives--

        if (gameState.lives <= 0) {

            gameState.screen = SCREEN.GAME_OVER

            notifyUIChanged()

            return
        }

        // Respawn.
        Health.current[pid] = Health.max[pid]

        // Clear all statuses.
        StatusEffect.frozen[pid] = 0
        StatusEffect.corrosionRemaining[pid] = 0
        StatusEffect.corrosionDamage[pid] = 0

        notifyUIChanged()

        return
    }

    // --------------------------------------------------------
    // Expire player corrosion
    // --------------------------------------------------------

    if (StatusEffect.corrosionRemaining[pid] <= 0) {
        StatusEffect.corrosionRemaining[pid] = 0
        StatusEffect.corrosionDamage[pid] = 0
    }
}