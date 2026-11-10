// src/ecs/combat/nearMissSystem.js

import {
    Asteroid,
    Position,
    Velocity,
    Health,
    Invulnerability,
} from "../constants/components.js"

import { playerQuery } from "../constants/queries.js"
import { activeAsteroids } from "../pools/asteroidPool.js"

import { startState } from "../../state/startState.js"

import {
    awardCombatScore,
} from "./combatScoring.js"

export const NEAR_MISS = Object.freeze({
    PLAYER_RADIUS: 0.6,
    DISTANCE: 0.85,
    MIN_RELATIVE_SPEED: 1.5,
    MIN_DURATION: 0.04,
    MAX_DURATION: 2,
    POINTS: 75,
})

// Reused entity IDs must not inherit near-miss history.
const tracked = new Map()

let elapsed = 0

export function resetNearMissSystem() {
    tracked.clear()
    elapsed = 0
}

// Call this when a physical asteroid/player
// collision has actually occurred.
export function invalidateNearMiss(id) {
    const state = tracked.get(id)

    if (state) {
        state.invalid = true
    }
}

function relativeSpeed(pid, aid) {
    const vx = Velocity.x[pid] - Velocity.x[aid]
    const vy = Velocity.y[pid] - Velocity.y[aid]

    return Math.hypot(vx, vy)
}

function awardNearMiss() {
    return awardCombatScore({
        basePoints: NEAR_MISS.POINTS,
        comboKills: 0,
    })
}

export function nearMissSystem(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return

    if (startState.encounterPhase !== "active") {
        resetNearMissSystem()
        return
    }

    const players = playerQuery()

    if (players.length === 0) {
        resetNearMissSystem()
        return
    }

    const pid = players[0]

    if (
        Health.current[pid] <= 0 ||
        Invulnerability.remaining[pid] > 0
    ) {
        // Prevent rewards during invulnerability.
        resetNearMissSystem()
        return
    }

    elapsed += dt

    const px = Position.x[pid]
    const py = Position.y[pid]

    for (let i = 0; i < activeAsteroids.length; i++) {
        const aid = activeAsteroids[i]

        if (Asteroid.active[aid] !== 1) continue

        const version = Asteroid.spawnVersion[aid]

        let state = tracked.get(aid)

        if (!state || state.version !== version) {
            state = {
                version,
                inside: false,
                invalid: false,
                awarded: false,
                enteredAt: 0,
            }

            tracked.set(aid, state)
        }

        if (state.awarded || state.invalid) continue

        const dx = px - Position.x[aid]
        const dy = py - Position.y[aid]

        const distance = Math.hypot(dx, dy)

        const collisionDistance =
            NEAR_MISS.PLAYER_RADIUS + Asteroid.radius[aid]

        const clearance = distance - collisionDistance

        // Any actual overlap disqualifies this asteroid.
        if (clearance <= 0) {
            state.invalid = true
            continue
        }

        const inNearMissBand =
            clearance <= NEAR_MISS.DISTANCE

        if (inNearMissBand) {
            if (!state.inside) {
                if (
                    relativeSpeed(pid, aid) <
                    NEAR_MISS.MIN_RELATIVE_SPEED
                ) {
                    continue
                }

                state.inside = true
                state.enteredAt = elapsed
            }

            continue
        }

        if (!state.inside) continue

        const duration = elapsed - state.enteredAt

        state.inside = false

        if (
            duration < NEAR_MISS.MIN_DURATION ||
            duration > NEAR_MISS.MAX_DURATION
        ) {
            state.invalid = true
            continue
        }

        state.awarded = true
        awardNearMiss()
    }
}
