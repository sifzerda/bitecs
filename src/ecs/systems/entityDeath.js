// src/ecs/systems/entityDeath.js

import { removeEntity } from "bitecs"
import { world } from "../constants/world.js"
import { gameState } from "../../state/gameState.js"

import { BossAI, Velocity } from "../constants/components.js"
import { releaseAsteroidEntity } from "../pools/asteroidPool"

import { emitEffect } from "../../effects/effects.js"
import { EFFECT } from "../../effects/EffectTypes.js"

// Shoots smoke off in the direction the entity was last moving, so debris
// looks like it's still carrying momentum as it dies. Falls back to a
// random heading for anything with no velocity (e.g. a stationary asteroid).
function smokeDirectionFor(id) {

    const vx = Velocity.x[id] ?? 0
    const vy = Velocity.y[id] ?? 0

    if (vx === 0 && vy === 0) {
        return Math.random() * Math.PI * 2
    }

    return Math.atan2(vy, vx)

}

export function killAsteroid(id, x, y) {

    // read velocity before the entity/pool slot gets recycled
    const direction = smokeDirectionFor(id)

    releaseAsteroidEntity(id)

    gameState.asteroidsRemaining--
    gameState.score += 100

    // Death explosion
    emitEffect(EFFECT.EXPLOSION, {
        x,
        y,
        size: 1.5,
    })

    // Extra sparks
    emitEffect(EFFECT.SPARK_BURST, {
        x,
        y,
        count: 45,
        speed: 13,
        big: true,
    })

    // Smoke shoots off in the direction the asteroid was travelling
    emitEffect(EFFECT.SMOKE, {
        x,
        y,
        direction,
        count: 14,
    })

}

export function killBoss(id, x, y) {

    // read velocity before the entity is removed
    const direction = smokeDirectionFor(id)

    removeEntity(world, id)

    gameState.currentWeapon = BossAI.weapon[id]
    gameState.score += 1000
    gameState.bossAlive = false
    gameState.asteroidsRemaining = 0

    // Large stacked boss explosion
    emitEffect(EFFECT.EXPLOSION, {
        x,
        y,
        size: 5,
    })

    // Huge spark burst
    emitEffect(EFFECT.SPARK_BURST, {
        x,
        y,
        count: 90,
        speed: 16,
        big: true,
    })

    // Big smoke jet shooting off in the direction the boss was travelling
    emitEffect(EFFECT.SMOKE, {
        x,
        y,
        direction,
        count: 40,
    })

}