// src/ecs/state/gameLoop.js

import playerControlSystem from "../ecs/systems/playerControlSystem"
import { movementSystem } from "../ecs/systems/movement"
import { boundsSystem } from "../ecs/systems/bounds"
import { combatSystem } from "../ecs/systems/combat"
import { waveSystem } from "../ecs/systems/waveSystem"

export function gameLoop(shootState) {

    playerControlSystem(shootState)
    movementSystem()
    boundsSystem()
     waveSystem() 
    combatSystem()

}