// src/ecs/systems/entityDeath.js

import { removeEntity } from "bitecs"
import { world } from "../constants/world.js"
import { gameState } from "../../state/gameState.js"
import { BossAI, Velocity } from "../constants/components.js"
import { releaseAsteroidEntity } from "../pools/asteroidPool"

import { emitEffect } from "../../fx/effects.js"
import { EFFECT } from "../../fx/FXTypes"

function smokeDirectionFor(id) {

    const vx = Velocity.x[id] ?? 0
    const vy = Velocity.y[id] ?? 0

    if (vx === 0 && vy === 0) {
        return Math.random() * Math.PI * 2
    }

    return Math.atan2(vy, vx)
}

export function killAsteroid(id, x, y) {

    const direction = smokeDirectionFor(id)

    releaseAsteroidEntity(id)

    gameState.asteroidsRemaining--
    gameState.score += 100

    emitEffect(EFFECT.EXPLOSION, { x, y, size: 1.5 })

    emitEffect(EFFECT.SHOCKWAVE, { x, y, radius: 1 })
    emitEffect(EFFECT.FIRE, { x, y, count: 20 })

    emitEffect(EFFECT.SPARK_BURST, { x, y, count: 45, speed: 13, big: true })
    emitEffect(EFFECT.SMOKE, { x, y, direction, count: 14 })
    emitEffect(EFFECT.DEBRIS, { x, y, count: 8, speed: 10, size: 0.5, kind: "rock", maxLife: 1.6 })

}

export function killBoss(id, x, y) {

    const direction = smokeDirectionFor(id)

    removeEntity(world, id)

    gameState.currentWeapon = BossAI.weapon[id]
    gameState.score += 1000
    gameState.bossAlive = false
    gameState.asteroidsRemaining = 0

    emitEffect(EFFECT.EXPLOSION, { x, y, size: 5 })
    emitEffect(EFFECT.SHOCKWAVE, { x, y, radius: 2.5 })
    emitEffect(EFFECT.FIRE, { x, y, count: 60 })
    emitEffect(EFFECT.SPARK_BURST, { x, y, count: 90, speed: 16, big: true })
    emitEffect(EFFECT.SMOKE, { x, y, direction, count: 40 })
    emitEffect(EFFECT.DEBRIS, { x, y, count: 24, speed: 14, size: 1.2, kind: "metal", maxLife: 2.2 })

}