// src/ecs/systems/entityDeath.js

import { bossQuery } from "../constants/queries.js"

import { destroyBoss } from "../bosses/BossManager.js"

import {
    destroyAsteroid,
} from "../asteroids/AsteroidManager.js"

import {
    getRemainingAsteroidCount,
} from "../waves/waveState.js"

import { startState } from "../../state/startState.js"
import { useGameStore } from "../../../store/gameStore.js"

import { emitEffect } from "../../fx/effects.js"
import { EFFECT } from "../../fx/FXTypes.js"

import { beginEncounterClear } from "./encounterSystem.js"

import {
    recordWaveAsteroidKill,
} from "../waves/waveScheduler.js"

import {
    awardAsteroidKill,
    awardBossKill,
} from "../combat/combatScoring.js"

import {
    Position,
    Asteroid,
    Health,
    Invulnerability,
} from "../constants/components.js"

import { playerQuery } from "../constants/queries.js"

import {
    getAsteroidDangerBonus,
} from "../combat/dangerBonus.js"

// ============================================================
// ENCOUNTER COMPLETION
// ============================================================

export function checkEncounterComplete() {
    const remaining = getRemainingAsteroidCount()

    startState.asteroidsRemaining = remaining

    if (
        startState.encounterPhase !== "active" ||
        remaining > 0 ||
        bossQuery().length > 0
    ) {
        return false
    }

    return beginEncounterClear()
}

// ============================================================
// ASTEROID DEATH
// ============================================================

function calculateKillDangerBonus(id, x, y) {
    const players = playerQuery()

    if (players.length === 0) return 0

    const pid = players[0]

    if (
        Health.current[pid] <= 0 ||
        Invulnerability.remaining[pid] > 0
    ) {
        return 0
    }

    return getAsteroidDangerBonus({
        playerX: Position.x[pid],
        playerY: Position.y[pid],
        asteroidX: x,
        asteroidY: y,
        asteroidRadius: Asteroid.radius[id],
    })
}

export function killAsteroid(id, x, y) {
    // Calculate before destruction because the asteroid
    // pool may immediately reuse or clear component data.
    const dangerBonus =
        Asteroid.active[id] === 1
            ? calculateKillDangerBonus(id, x, y)
            : 0

    const destroyed = destroyAsteroid(id, x, y)

    if (!destroyed) return false

    recordWaveAsteroidKill()
    awardAsteroidKill(dangerBonus)

    const { scale, direction } = destroyed

    emitEffect(EFFECT.EXPLOSION, {
        x,
        y,
        size: 1.5 * Math.max(0.5, scale),
    })

    emitEffect(EFFECT.SPARK_BURST, {
        x,
        y,
        direction,
        spread: Math.PI * 1.5,
        count: 45,
        speed: 13,
        big: true,
    })

    emitEffect(EFFECT.SMOKE, {
        x,
        y,
        direction,
        count: 14,
    })

    emitEffect(EFFECT.DEBRIS, {
        x,
        y,
        count: 10,
        speed: 10,
        size: 0.6,
        kind: "rock",
        maxLife: 1.2,
    })

    checkEncounterComplete()

    return true
}

// ============================================================
// BOSS DEATH
// ============================================================

export function killBoss(id, x, y) {
    const destroyed = destroyBoss(id)

    if (!destroyed) return false

    const { direction, weaponId } = destroyed

    awardBossKill()

    if (weaponId != null) {
        useGameStore.getState().unlockWeapon(weaponId)
    }

    emitEffect(EFFECT.EXPLOSION, {
        x,
        y,
        size: 5,
    })

    emitEffect(EFFECT.SPARK_BURST, {
        x,
        y,
        direction,
        spread: Math.PI * 1.75,
        count: 90,
        speed: 16,
        big: true,
    })

    emitEffect(EFFECT.SMOKE, {
        x,
        y,
        direction,
        count: 40,
    })

    emitEffect(EFFECT.DEBRIS, {
        x,
        y,
        count: 24,
        speed: 8,
        size: 1,
        kind: "metal",
        maxLife: 2.2,
    })

    checkEncounterComplete()

    return true
}

// ============================================================
// PLAYER DEATH
// ============================================================

export function emitPlayerDeathDebris(x, y) {
    emitEffect(EFFECT.DEBRIS, {
        x,
        y,
        count: 16,
        speed: 8,
        size: 0.6,
        kind: "metal",
        maxLife: 1.6,
    })
}
