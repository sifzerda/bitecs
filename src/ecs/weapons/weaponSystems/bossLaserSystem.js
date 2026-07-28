// src/ecs/weapons/weaponSystems/bossLaserSystem.js

import { world } from "../../constants/world.js"
import { bossAIQuery, playerQuery } from "../../constants/queries.js"
import { Position, BossAI, Health } from "../../constants/components.js"
import { getWeapon } from "../config/weapons.js"
import { bossLaserState } from "../weaponState/bossLaserState.js"

const BEAM_ON_DURATION = 3.0
const BEAM_OFF_DURATION = 6.0

export function bossLaserSystem() {

    const dt = world.time.delta
    const bosses = bossAIQuery()
    const players = playerQuery()

    if (bosses.length === 0 || players.length === 0) {
        bossLaserState.active = false
        bossLaserState.beamCount = 0
        return
    }

    const id = bosses[0]
    const weapon = getWeapon(BossAI.weapon[id])

    if (weapon.category !== "beam") {
        bossLaserState.active = false
        bossLaserState.beamCount = 0
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
        bossLaserState.beamCount = 0
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

    bossLaserState.beamCount = 1

    // Reset beam data
    for (let i = 0; i < bossLaserState.dirX.length; i++) {
        bossLaserState.hit[i] = 0
        bossLaserState.hitT[i] = 0
    }

    if (dist <= weapon.range) {

        const inv = 1 / Math.max(dist, 0.0001)

        bossLaserState.dirX[0] = dx * inv
        bossLaserState.dirY[0] = dy * inv

        bossLaserState.hitT[0] = dist
        bossLaserState.hitX[0] = Position.x[pid]
        bossLaserState.hitY[0] = Position.y[pid]
        bossLaserState.hit[0] = 1

        // legacy fields
        bossLaserState.hitLegacy = true
        bossLaserState.hitXLegacy = Position.x[pid]
        bossLaserState.hitYLegacy = Position.y[pid]
        bossLaserState.length = dist

        Health.current[pid] -= weapon.damagePerSecond * dt

    } else {

        const inv = 1 / Math.max(dist, 0.0001)

        bossLaserState.dirX[0] = dx * inv
        bossLaserState.dirY[0] = dy * inv

        bossLaserState.hitT[0] = weapon.range
        bossLaserState.hitX[0] = Position.x[id] + bossLaserState.dirX[0] * weapon.range
        bossLaserState.hitY[0] = Position.y[id] + bossLaserState.dirY[0] * weapon.range
        bossLaserState.hit[0] = 0

        // legacy fields
        bossLaserState.hitLegacy = false
        bossLaserState.hitXLegacy = bossLaserState.hitX[0]
        bossLaserState.hitYLegacy = bossLaserState.hitY[0]
        bossLaserState.length = weapon.range
    }
}