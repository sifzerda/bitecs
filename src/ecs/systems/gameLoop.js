// src/ecs/systems/gameLoop.js

import playerControlSystem from "./playerControlSystem.js"

import { movementSystem } from "./movement.js"
import { boundsSystem } from "./bounds.js"
import { combatSystem } from "./combat.js"

export function gameLoop(
    keys,
    shootState
){

    playerControlSystem(keys, shootState)
    movementSystem()
    boundsSystem()
    combatSystem()

}