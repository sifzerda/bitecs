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
// Apply status effects
// ============================================================

export function applyStatusEffects(targetId, weapon) {

    // --------------------------------------------------------
    // Corrosion
    // --------------------------------------------------------

    if (
        weapon.corrosion &&
        weapon.corrosionDamagePerSecond > 0 &&
        weapon.corrosionDuration > 0
    ) {

        // Apply/refresh corrosion duration.
        StatusEffect.corrosion[targetId] =
            Math.max(
                StatusEffect.corrosion[targetId],
                weapon.corrosionDuration
            )

        // Store the corrosion damage rate.
        StatusEffect.corrosionDamagePerSecond[targetId] =
            weapon.corrosionDamagePerSecond
    }


    // --------------------------------------------------------
    // Freeze
    // --------------------------------------------------------

    if (
        weapon.freezeDuration &&
        weapon.freezeDuration > 0
    ) {

        // Refresh freeze duration.
        StatusEffect.frozen[targetId] =
            Math.max(
                StatusEffect.frozen[targetId],
                weapon.freezeDuration
            )
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

        if (StatusEffect.corrosion[id] > 0) {

            Health.current[id] -=
                StatusEffect.corrosionDamagePerSecond[id] * dt

            StatusEffect.corrosion[id] -= dt


            // ------------------------------------------------
            // Death from corrosion
            // ------------------------------------------------

            if (Health.current[id] <= 0) {

                killAsteroid(
                    id,
                    Position.x[id],
                    Position.y[id]
                )

                continue
            }


            // ------------------------------------------------
            // Corrosion expired
            // ------------------------------------------------

            if (StatusEffect.corrosion[id] <= 0) {

                StatusEffect.corrosion[id] = 0
                StatusEffect.corrosionDamagePerSecond[id] = 0
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

        if (StatusEffect.corrosion[id] > 0) {

            Health.current[id] -=
                StatusEffect.corrosionDamagePerSecond[id] * dt

            StatusEffect.corrosion[id] -= dt


            // ------------------------------------------------
            // Death from corrosion
            // ------------------------------------------------

            if (Health.current[id] <= 0) {

                killBoss(
                    id,
                    Position.x[id],
                    Position.y[id]
                )

                continue
            }


            // ------------------------------------------------
            // Corrosion expired
            // ------------------------------------------------

            if (StatusEffect.corrosion[id] <= 0) {

                StatusEffect.corrosion[id] = 0
                StatusEffect.corrosionDamagePerSecond[id] = 0
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

    if (StatusEffect.corrosion[pid] > 0) {

        Health.current[pid] -=
            StatusEffect.corrosionDamagePerSecond[pid] * dt

        StatusEffect.corrosion[pid] -= dt


        // ----------------------------------------------------
        // Corrosion expired
        // ----------------------------------------------------

        if (StatusEffect.corrosion[pid] <= 0) {

            StatusEffect.corrosion[pid] = 0
            StatusEffect.corrosionDamagePerSecond[pid] = 0
        }
    }


    // --------------------------------------------------------
    // Player death
    // --------------------------------------------------------

    if (Health.current[pid] <= 0) {

        gameState.lives--


        // ----------------------------------------------------
        // Game over
        // ----------------------------------------------------

        if (gameState.lives <= 0) {

            gameState.screen = SCREEN.GAME_OVER

            notifyUIChanged()

            return
        }


        // ----------------------------------------------------
        // Respawn
        // ----------------------------------------------------

        Health.current[pid] =
            Health.max[pid]


        // Clear all active statuses.
        StatusEffect.frozen[pid] = 0
        StatusEffect.corrosion[pid] = 0
        StatusEffect.corrosionDamagePerSecond[pid] = 0
    }
}