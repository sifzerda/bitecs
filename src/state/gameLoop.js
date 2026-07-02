// src/ecs/state/gameLoop.js

import playerControlSystem from "../ecs/systems/playerControlSystem"
import { movementSystem } from "../ecs/systems/movement"
import { boundsSystem } from "../ecs/systems/bounds"
import { combatSystem } from "../ecs/systems/combat"

export function gameLoop(shootState) {

    playerControlSystem(shootState)
    movementSystem()
    boundsSystem()
    combatSystem()

}