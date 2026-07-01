// src/bosses/ufo/spawn.js

import { spawnUfo } from "../../ecs/spawnUfo"
import { UfoHealth } from "../../ecs/components"
import { UFO_CONFIG } from "./config"

export function spawnUfoBoss(x, y, wave) {
    const id = spawnUfo(x, y)

    const hp = getUfoHealth(wave)

    UfoHealth.current[id] = hp
    UfoHealth.max[id] = hp

    return id
}

function getUfoHealth(wave) {
    return UFO_CONFIG.baseHealth + wave * UFO_CONFIG.healthPerWave
}