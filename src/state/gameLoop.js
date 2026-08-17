// src/ecs/state/gameLoop.js

import playerControlSystem from "../ecs/systems/playerControlSystem"
import { movementSystem } from "../ecs/systems/movement"
import { asteroidCollisionSystem } from "../ecs/systems/asteroidCollisionSystem"
import { boundsSystem } from "../ecs/systems/bounds"
import { combatSystem } from "../ecs/systems/combat"
import { waveSystem } from "../ecs/systems/waveSystem"
import { trailSystem } from "../ecs/systems/trailSystem"

import { invulnerabilitySystem } from "../ecs/systems/invulnerabilitySystem"

import { laserSystem } from "../ecs/weapons/weaponSystems/laserSystem"
import { missileSystem } from "../ecs/weapons/weaponSystems/missileSystem"
import { throwerSystem } from "../ecs/weapons/weaponSystems/throwerSystem"
import { updateArcs } from "../ecs/weapons/weaponState/arcState"
import { statusEffectSystem } from "../ecs/systems/statusEffectSystem.js"

import { bossAISystem } from "../ecs/systems/bossAISystem"
import { bossLaserSystem } from "../ecs/weapons/weaponSystems/bossLaserSystem"
import { bossThrowerSystem } from "../ecs/weapons/weaponSystems/bossThrowerSystem"

import { octoAISystem } from "../ecs/systems/octoAISystem"

// fx
import { updateSparkEmitter } from "../fx/gpu/SparkEmitter"
import { exhaustEmitter } from "../fx/gpu/exhaustEmitter"
import { updateEffects } from "../fx/index"

import {
    clearSpatialGrids,
    insertAsteroid,
    insertBoss
} from "../ecs/constants/spatialGrid"

import { activeAsteroids } from "../ecs/pools/asteroidPool"
import { bossQuery } from "../ecs/constants/queries"

// import { tentacleSystem } from "../ecs/systems/tentacleSystem"

export function gameLoop(shootState, dt) {

    playerControlSystem(shootState)

    bossAISystem()
    octoAISystem()
    bossLaserSystem()
    bossThrowerSystem()

    // tentacleSystem(dt)

    missileSystem()

    // Move entities
    movementSystem()

    // Resolve physical asteroid collisions
    asteroidCollisionSystem()
    invulnerabilitySystem()

    exhaustEmitter()
    boundsSystem()
    waveSystem()

    // spatial grid ------------ //

    clearSpatialGrids()

    for (let i = 0; i < activeAsteroids.length; i++) {
        insertAsteroid(activeAsteroids[i])
    }

    const bosses = bossQuery()

    for (let i = 0; i < bosses.length; i++) {
        insertBoss(bosses[i])
    }

    // ------------------------- //

    combatSystem()
    laserSystem()
    throwerSystem()
    statusEffectSystem()

    trailSystem()
    updateArcs(dt)

    updateEffects()
    updateSparkEmitter(dt)
}
