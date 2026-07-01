// src/ecs/systems/gameLoop.js

import playerControlSystem from "./playerControlSystem.js"
import { movementSystem } from "./movement.js"
import { boundsSystem } from "./bounds.js"
import { combatSystem } from "./combat.js"
import { spawnDirectorSystem } from "./spawnDirector.js"
import { ufoMovementSystem } from "./ufoMovementSystem.js"
import { ufoShootSystem } from "./ufoShootSystem.js"
import { gameDirectorSystem } from "../../progression/GameDirector.js"

export function gameLoop(keys, shootState) {

    //-------------------------
    // Game Progression
    //-------------------------
    gameDirectorSystem()

    //-------------------------
    // Spawning
    //-------------------------
    spawnDirectorSystem()

    //-------------------------
    // Player
    //-------------------------
    playerControlSystem(keys, shootState)

    //-------------------------
    // AI
    //-------------------------
    ufoMovementSystem()
    ufoShootSystem()

    //-------------------------
    // Physics
    //-------------------------
    movementSystem()
    boundsSystem()

    //-------------------------
    // Combat
    //-------------------------
    combatSystem()
}