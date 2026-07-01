// src/progression/stageManager.js

import { progressionState } from "./progressionState"
import { gameStats } from "../state/gameStats"

export function stageManagerSystem() {

    //------------------------------------
    // Temporary compatibility
    //------------------------------------

    gameStats.wave = progressionState.wave
    gameStats.difficulty = progressionState.difficulty

}