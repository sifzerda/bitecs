// src/ecs/systems/gameLoop.js

import playerControlSystem from "./playerControlSystem.js"
import { movementSystem } from "./movement.js"
import { boundsSystem } from "./bounds.js"
import { combatSystem } from "./combat.js"
import { difficultySystem } from "./difficultySystem.js"
import { spawnDirectorSystem } from "./spawnDirector.js"
import { ufoMovementSystem } from "./ufoMovementSystem.js"
import { ufoShootSystem } from "./ufoShootSystem.js"

export function gameLoop(keys, shootState) {

    difficultySystem()
    spawnDirectorSystem()

    playerControlSystem(keys, shootState)
    movementSystem()
    ufoMovementSystem()
    ufoShootSystem()
    boundsSystem()
    combatSystem()
}