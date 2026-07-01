// src/progression/stageManager.js

import { progressionState } from "./progressionState";

export function stageManagerSystem() {

    //---------------------------------------
    // Keep compatibility with current game.
    //---------------------------------------

    progressionState.wave = progressionState.wave;
}

export function bossSpawned() {
    progressionState.bossAlive = true;
    progressionState.bossSpawnedThisWave = true;
}