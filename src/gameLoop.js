// src/ecs/systems/gameLoop.js

import playerControlSystem from "./ecs/systems/playerControlSystem"
import { movementSystem } from "./ecs/systems/movement"
import { boundsSystem } from "./ecs/systems/bounds.js"
import { combatSystem } from "./ecs/systems/combat.js"
import { gameDirectorSystem } from "./progression/GameDirector"

import { updateMovement } from "./bosses/ufo/movement"
import { updateShooting } from "./bosses/ufo/shooting"

export function gameLoop(keys, shootState) {

    //-------------------------
    // Game Progression
    //-------------------------
    gameDirectorSystem()

 

    //-------------------------
    // Player
    //-------------------------
    playerControlSystem(keys, shootState)

    //-------------------------
    // AI
    //-------------------------
    updateMovement()
    updateShooting()

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