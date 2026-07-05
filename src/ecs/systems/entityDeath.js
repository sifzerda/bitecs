// src/ecs/systems/entityDeath.js

import { removeEntity } from "bitecs"
import { world } from "../constants/world.js"
import { gameState } from "../../state/gameState.js"
import { spawnSparkBurst } from "../spawn.js"
import { BossAI } from "../constants/components.js"

export function killAsteroid(id, x, y) {

    removeEntity(world, id)

    gameState.asteroidsRemaining--
    gameState.score += 100

    spawnSparkBurst(x, y, { count: 45, speed: 13, big: true })
}

export function killBoss(id, x, y) {

    removeEntity(world, id)
    gameState.currentWeapon = BossAI.weapon[id]
    gameState.score += 1000
    gameState.bossAlive = false
    gameState.asteroidsRemaining = 0

    spawnSparkBurst(x, y, { count: 90, speed: 16, big: true })
}