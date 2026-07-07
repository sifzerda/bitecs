// src/ecs/state/gameLoop.js

import playerControlSystem from "../ecs/systems/playerControlSystem"
import { movementSystem } from "../ecs/systems/movement"
import { boundsSystem } from "../ecs/systems/bounds"
import { combatSystem } from "../ecs/systems/combat"
import { sparkSystem } from "../ecs/systems/sparkSystem"
import { waveSystem } from "../ecs/systems/waveSystem"
import { laserSystem } from "../ecs/systems/laserSystem"
import { hazardSystem } from "../ecs/systems/hazardSystem"
import { flameSystem } from "../ecs/systems/flameSystem"
import { bossAISystem } from "../ecs/systems/bossAISystem"
import { bossLaserSystem } from "../ecs/systems/bossLaserSystem.js"
import { missileSystem } from "../ecs/systems/missileSystem"

//import { clearSpatialGrid, insertIntoSpatialGrid } from '../ecs/constants/spatialGrid.js'


export function gameLoop(shootState) {

    playerControlSystem(shootState)
    bossAISystem()
    bossLaserSystem()
    
    missileSystem()

    movementSystem()
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
    sparkSystem()
    flameSystem()

}