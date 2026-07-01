// src/debug/debugBoss.js

import { bossRegistry } from "../bosses/bossRegistry"

export function spawnDebugBoss(bossId = "ufo", x = 0, y = 4, wave = 5) {
    const boss = bossRegistry[bossId]

    if (!boss) {
        console.warn(`Boss not found: ${bossId}`)
        return null
    }

    return boss.spawn(x, y, wave)
}