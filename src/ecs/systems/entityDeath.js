// src/ecs/systems/entityDeath.js

import { removeEntity } from "bitecs"
import { world } from "../constants/world.js"
import { gameState } from "../../state/gameState.js"

import { BossAI } from "../constants/components.js"
import { releaseAsteroidEntity } from "../pools/asteroidPool"

import { emitEffect } from "../../effects/effects.js"
import { EFFECT } from "../../effects/EffectTypes.js"

export function killAsteroid(id, x, y) {

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

 

}

export function killBoss(id, x, y) {

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

}