// src/ecs/systems/bossLaserSystem.js

import { world } from "../constants/world.js"
import { bossAIQuery, playerQuery } from "../constants/queries.js"
import { Position, BossAI, Health } from "../constants/components.js"
import { getWeapon } from "../constants/weapons.js"
import { bossLaserState } from "../../state/bossLaserState.js"

const BEAM_ON_DURATION = 3.0
const BEAM_OFF_DURATION = 6.0

export function bossLaserSystem() {

    const dt = world.time.delta
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

    //----------------------------------
    // On/off cycle
    //----------------------------------

    BossAI.beamCycleTimer[id] -= dt

    if (BossAI.beamCycleTimer[id] <= 0) {
        if (BossAI.beamActive[id]) {
            BossAI.beamActive[id] = 0
            BossAI.beamCycleTimer[id] = BEAM_OFF_DURATION
        } else {
            BossAI.beamActive[id] = 1
            BossAI.beamCycleTimer[id] = BEAM_ON_DURATION
        }
    }

    if (!BossAI.beamActive[id]) {
        bossLaserState.active = false
        return
    }

    //----------------------------------
    // Firing (unchanged from before)
    //----------------------------------

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