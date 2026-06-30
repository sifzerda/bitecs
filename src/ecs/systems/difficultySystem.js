//src/ecs/systems/difficultySystem.js

import { world } from "../constants/world.js"
import { gameStats } from "../../state/gameStats.js"

const MAX_DIFFICULTY = 20

export function difficultySystem() {

    // Keep track of survival time
    gameStats.timeAlive = world.time.elapsed
    gameStats.wave = Math.floor(gameStats.timeAlive / 45) + 1

    //-------------------------------------------------
    // Base difficulty
    //-------------------------------------------------

    let difficulty = 1

    //-------------------------------------------------
    // Time scaling
    //
    // +0.5 every minute survived
    //-------------------------------------------------

    difficulty += gameStats.timeAlive / 120

    //-------------------------------------------------
    // Score scaling
    //
    // +1 every 5000 score
    //-------------------------------------------------

    difficulty += gameStats.score / 5000

    //-------------------------------------------------
    // Wave scaling
    //-------------------------------------------------

    difficulty += (gameStats.wave - 1) * 0.75

    //-------------------------------------------------
    // Adaptive Difficulty
    //-------------------------------------------------

    // Player doing well

    if (gameStats.health > 90)
        difficulty += 0.3

    // Player struggling

    if (gameStats.health < 35)
        difficulty -= 0.5

    if (gameStats.health < 15)
        difficulty -= 0.5

    //-------------------------------------------------
    // Lives remaining
    //-------------------------------------------------

    if (gameStats.lives === 2)
        difficulty -= 0.25

    if (gameStats.lives === 1)
        difficulty -= 0.75

    //-------------------------------------------------
    // Clamp
    //-------------------------------------------------

    difficulty = Math.max(1, difficulty)
    difficulty = Math.min(MAX_DIFFICULTY, difficulty)

    //-------------------------------------------------
    // Smooth interpolation
    //
    // Prevents sudden jumps.
    //-------------------------------------------------

    gameStats.difficulty +=
        (difficulty - gameStats.difficulty) * 0.03

}