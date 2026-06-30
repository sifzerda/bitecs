// src/ecs/systems/gameLoop.js

import playerControlSystem from "./playerControlSystem.js"
import { movementSystem } from "./movement.js"
import { boundsSystem } from "./bounds.js"
import { combatSystem } from "./combat.js"
import { difficultySystem } from "./difficultySystem.js"
import { spawnDirectorSystem } from "./spawnDirector.js"

export function gameLoop(keys, shootState) {

    //-------------------------------------
    // Update progression
    //-------------------------------------

    difficultySystem()
    spawnDirectorSystem()

    //-------------------------------------
    // Gameplay
    //-------------------------------------

    playerControlSystem(keys, shootState)
    movementSystem()
    boundsSystem()
    combatSystem()
}