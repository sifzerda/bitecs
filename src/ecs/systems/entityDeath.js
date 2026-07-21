// src/ecs/systems/entityDeath.js

import { removeEntity } from "bitecs"
import { world } from "../constants/world.js"
import { gameState } from "../../state/gameState.js"
import { spawnSparkBurst } from "../spawn.js"
import { BossAI } from "../constants/components.js"
import { releaseAsteroidEntity } from "../pools/asteroidPool"

import { emitEffect } from "../../effects/effects.js"
import { EFFECT } from "../../effects/EffectTypes.js"

export function killAsteroid(id, x, y) {

    releaseAsteroidEntity(id)
    gameState.asteroidsRemaining--
    gameState.score += 100

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

    emitEffect(EFFECT.SPARK_BURST, {
    x,
    y,
    count: 90,
    speed: 16,
    big: true,
})



}