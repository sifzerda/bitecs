// src/ecs/state/gameLoop.js

import playerControlSystem from "./ecs/systems/playerControlSystem.js"
import { movementSystem } from "./ecs/systems/movement.js"
import { boundsSystem } from "./ecs/systems/bounds.js"
import { combatSystem } from "./ecs/systems/combat.js"

export function gameLoop(shootState) {

    playerControlSystem(shootState)
    movementSystem()
    boundsSystem()
    combatSystem()

}