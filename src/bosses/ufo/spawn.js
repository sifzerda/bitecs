// src/bosses/ufo/spawn.js

import { spawnUfo } from "../../ecs/spawnUfo"
import { UfoHealth } from "../../ecs/components"
import { UFO_BOSS } from "./config"

export function spawnUfoBoss(x, y) {

    const id = spawnUfo(x, y)

    UfoHealth.current[id] = UFO_BOSS.maxHealth
    UfoHealth.max[id] = UFO_BOSS.maxHealth

    return id

}