// src/state/resetWeaponVisuals.js

import { laserState } from "../ecs/weapons/weaponState/laserState.js"
import { bossLaserState } from "../ecs/weapons/weaponState/bossLaserState.js"
import { throwerState } from "../ecs/weapons/weaponState/throwerState.js"
import { bossThrowerState } from "../ecs/weapons/weaponState/bossThrowerState.js"

export function resetWeaponVisuals() {

    for (
        const state of [laserState, bossLaserState]
    ) {
        state.active = false; 
        state.beamCount = 0; 
        state.sparkTimer = 0
        state.lockTargetId = -1; 
        state.lockTime = 0
        state.hitActive?.fill(0)
    }

    for (
        const state of [throwerState, bossThrowerState]
    ) {
        state.active = false;
        state.sparkTimer = 0
        if (state.hitIds)
            state.hitIds.length = 0
    }
}
