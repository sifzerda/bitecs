// src/ecs/state/gameLoop.js

import playerControlSystem from "../ecs/systems/playerControlSystem"
import { movementSystem } from "../ecs/systems/movement"
import { boundsSystem } from "../ecs/systems/bounds"
import { combatSystem } from "../ecs/systems/combat"
import { waveSystem } from "../ecs/systems/waveSystem"
import { trailSystem } from "../ecs/systems/trailSystem"

import { laserSystem } from "../ecs/weapons/weaponSystems/laserSystem"
import { missileSystem } from "../ecs/weapons/weaponSystems/missileSystem"
import { throwerSystem } from "../ecs/weapons/weaponSystems/throwerSystem"
import { hazardSystem } from "../ecs/weapons/weaponSystems/hazardSystem"
import { updateArcs } from "../ecs/weapons/weaponState/arcState"

import { bossAISystem } from "../ecs/systems/bossAISystem"
import { bossLaserSystem } from "../ecs/weapons/weaponSystems/bossLaserSystem"
import { bossThrowerSystem } from "../ecs/weapons/weaponSystems/bossThrowerSystem"
// fx
import { updateSparkEmitter } from "../fx/gpu/SparkEmitter"
import { exhaustEmitter } from "../fx/gpu/exhaustEmitter"
import { updateEffects } from "../fx/index"

import { clearSpatialGrids, insertAsteroid, insertBoss } from "../ecs/constants/spatialGrid"

import { activeAsteroids } from "../ecs/pools/asteroidPool"
import { bossQuery } from "../ecs/constants/queries"

//import { tentacleSystem } from "../ecs/systems/tentacleSystem"

export function gameLoop(shootState, dt) {

    playerControlSystem(shootState)
    bossAISystem()
    bossLaserSystem()
    bossThrowerSystem()

    //    tentacleSystem(dt)

    missileSystem()
    movementSystem()
    exhaustEmitter()
    boundsSystem()
    waveSystem()

        // spatial grid------------//
    clearSpatialGrids()

    for (let i = 0; i < activeAsteroids.length; i++) {
        insertAsteroid(activeAsteroids[i])
    }

    const bosses = bossQuery()

    for (let i = 0; i < bosses.length; i++) {
        insertBoss(bosses[i])
    }

    //-----------------------//

    hazardSystem()
    combatSystem()
    laserSystem()
    throwerSystem()

    trailSystem()
    updateArcs(dt)

    updateEffects()
    updateSparkEmitter(dt)

}

