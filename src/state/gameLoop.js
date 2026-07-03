// src/ecs/state/gameLoop.js

import playerControlSystem from "../ecs/systems/playerControlSystem"
import { movementSystem } from "../ecs/systems/movement"
import { boundsSystem } from "../ecs/systems/bounds"
import { combatSystem } from "../ecs/systems/combat"
import { waveSystem } from "../ecs/systems/waveSystem"
import { bossAISystem } from "../ecs/systems/bossAISystem"
 

export function gameLoop(shootState) {

    playerControlSystem(shootState)
    bossAISystem()
 
    movementSystem()
    boundsSystem()
    waveSystem()
    combatSystem()

}