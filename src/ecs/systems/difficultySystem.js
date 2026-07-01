//src/ecs/systems/difficultySystem.js

import { progressionState } from "../../progression/progressionState"
import { gameStats } from "../../state/gameStats"

export function difficultySystem() {

    //-----------------------------------------
    // Temporary compatibility layer.
    //-----------------------------------------

    gameStats.difficulty = progressionState.difficulty

}