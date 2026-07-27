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
import { updateFireEmitter } from "../fx/gpu/FireEmitter"
import { updateEffects } from "../fx/index"

//import { tentacleSystem } from "../ecs/systems/tentacleSystem"
//import { clearSpatialGrid, insertIntoSpatialGrid } from '../ecs/constants/spatialGrid.js'

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

    // Rebuild spatial grid using final positions
    //clearSpatialGrid();

    //for (const asteroid of asteroids) {
    //  insertIntoSpatialGrid(asteroid);
    //}

    hazardSystem()
    combatSystem()
    laserSystem()
    throwerSystem()

    // reads final post-movement bullet positions, same as combat/hazard above;
    // pushes into the TRAIL effect queue that updateEffects() drains below
    trailSystem()
    updateArcs(dt)

    updateEffects()
    updateSparkEmitter(dt)
    updateFireEmitter(dt)

}