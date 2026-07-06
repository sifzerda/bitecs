// src/ecs/state/gameLoop.js

import playerControlSystem from "../ecs/systems/playerControlSystem"
import { movementSystem } from "../ecs/systems/movement"
import { boundsSystem } from "../ecs/systems/bounds"
import { combatSystem } from "../ecs/systems/combat"
import { sparkSystem } from "../ecs/systems/sparkSystem"
import { waveSystem } from "../ecs/systems/waveSystem"
import { laserSystem } from "../ecs/systems/laserSystem"
import { missileSystem } from "../ecs/systems/missileSystem"
import { ricochetSystem } from "../ecs/systems/ricochetSystem"
import { hazardSystem } from "../ecs/systems/hazardSystem"
import { flameSystem } from "../ecs/systems/flameSystem"

import { bossAISystem } from "../ecs/systems/bossAISystem"
import { bossLaserSystem } from "../ecs/systems/bossLaserSystem.js"



export function gameLoop(shootState) {

    playerControlSystem(shootState)
    bossAISystem()
    bossLaserSystem()
    
    missileSystem()

    movementSystem()
    boundsSystem()
    waveSystem()

    ricochetSystem()
    hazardSystem()
    combatSystem()
    laserSystem()
    sparkSystem()
    flameSystem()

}