// src/startGame.js

import { spawnPlayer } from "./ecs/spawn"
import { beginWave } from "./progression/waveManager"

let initialized = false

export function initializeGame() {
    if (initialized) return
    initialized = true

    spawnPlayer(0, 0)
    beginWave()
}