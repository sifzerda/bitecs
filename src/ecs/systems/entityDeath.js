// src/ecs/systems/entityDeath.js

import { removeEntity } from "bitecs"

import { world } from "../constants/world.js"

import { useGameStore, isBossLevel } from "../../../store/gameStore.js"
import { simState } from "../../state/simState.js"

import {
    BossAI,
    Velocity,
} from "../constants/components.js"

import {
    releaseAsteroidEntity,
} from "../pools/asteroidPool.js"

import { emitEffect } from "../../fx/effects.js"
import { EFFECT } from "../../fx/FXTypes.js"


function smokeDirectionFor(id) {

    const vx = Velocity.x[id] ?? 0
    const vy = Velocity.y[id] ?? 0

    if (vx === 0 && vy === 0) {
        return Math.random() * Math.PI * 2
    }

    return Math.atan2(vy, vx)
}


// ============================================================
// ASTEROID DEATH
// ============================================================

export function killAsteroid(id, x, y) {

    const direction = smokeDirectionFor(id)

    releaseAsteroidEntity(id)

    simState.asteroidsRemaining--
    simState.score += 100

    emitEffect(EFFECT.EXPLOSION, {
        x,
        y,
        size: 1.5,
    })

    emitEffect(EFFECT.SPARK_BURST, {
        x,
        y,
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
        count: 8,
        speed: 10,
        size: 0.5,
        kind: "rock",
        maxLife: 1.6,
    })

    if (simState.asteroidsRemaining <= 0) {
        const { level, advanceWave } = useGameStore.getState()
        if (!isBossLevel(level)) {
            advanceWave() // level 1→2→3→4 and bumps highestLevelReached
        }
    }
}


// ============================================================
// BOSS DEATH
// ============================================================

export function killBoss(id, x, y) {

    const direction = smokeDirectionFor(id)

    const weaponId = BossAI.weapon[id]

    removeEntity(world, id)


    // --------------------------------------------------------
    // Gameplay state
    // --------------------------------------------------------

    simState.score += 1000

    simState.bossAlive = false

    simState.asteroidsRemaining = 0


    // --------------------------------------------------------
    // Unlock weapon
    // --------------------------------------------------------

    if (
        weaponId != null &&
        !simState.unlockedWeapons.includes(weaponId)
    ) {
        simState.unlockedWeapons.push(weaponId)
    }

    simState.pendingUnlockWeapon = weaponId


    // --------------------------------------------------------
    // Complete level
    // --------------------------------------------------------
    //
    // This unlocks the next level and changes the screen to
    // STAGE_COMPLETE.
    //
    // It does NOT advance to the next level.
    //
    // --------------------------------------------------------

    useGameStore
        .getState()
        .completeCurrentLevel()


    // --------------------------------------------------------
    // Death effects
    // --------------------------------------------------------

    emitEffect(EFFECT.EXPLOSION, {
        x,
        y,
        size: 5,
    })

    emitEffect(EFFECT.SPARK_BURST, {
        x,
        y,
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
        speed: 14,
        size: 1.2,
        kind: "metal",
        maxLife: 2.2,
    })
}