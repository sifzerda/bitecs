//src/ecs/systems/bossLaserSystem.js

import { world } from "../constants/world.js"
import { bossAIQuery, playerQuery } from "../constants/queries.js"
import { Position, BossAI, Health } from "../constants/components.js"
import { getWeapon } from "../constants/weapons.js"
import { bossLaserState } from "../../state/bossLaserState.js"

export function bossLaserSystem() {

    const bosses = bossAIQuery()
    const players = playerQuery()

    if (bosses.length === 0 || players.length === 0) {
        bossLaserState.active = false
        return
    }

    const id = bosses[0]
    const weapon = getWeapon(BossAI.weapon[id])

    if (weapon.category !== "beam") {
        bossLaserState.active = false
        return
    }

    const pid = players[0]
    const dx = Position.x[pid] - Position.x[id]
    const dy = Position.y[pid] - Position.y[id]
    const dist = Math.hypot(dx, dy)

    bossLaserState.active = true
    bossLaserState.originX = Position.x[id]
    bossLaserState.originY = Position.y[id]
    bossLaserState.hitX = Position.x[pid]
    bossLaserState.hitY = Position.y[pid]
    bossLaserState.hit = dist <= weapon.range

    if (bossLaserState.hit) {
        Health.current[pid] -= weapon.damagePerSecond * world.time.delta
    }
}