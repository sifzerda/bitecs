// src/ecs/state/gameLoop.js

import playerControlSystem from "../ecs/systems/playerControlSystem"
import { movementSystem } from "../ecs/systems/movement"
import { boundsSystem } from "../ecs/systems/bounds"
import { combatSystem } from "../ecs/systems/combat"
import { sparkSystem } from "../ecs/systems/sparkSystem"
import { waveSystem } from "../ecs/systems/waveSystem"
import { bossAISystem } from "../ecs/systems/bossAISystem"
import { laserSystem } from "../ecs/systems/laserSystem"
import { missileSystem } from "../ecs/systems/missileSystem"


export function gameLoop(shootState) {

    playerControlSystem(shootState)
    bossAISystem()
    missileSystem()

    movementSystem()
    boundsSystem()
    waveSystem()
    combatSystem()
    laserSystem()
    sparkSystem()

}