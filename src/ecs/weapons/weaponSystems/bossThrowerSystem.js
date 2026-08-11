// src/ecs/weapons/weaponSystems/bossThrowerSystem.js

import { world } from "../../constants/world.js"
import { getEmissionPoint, getBossEmissionConfig } from '../../constants/emission.js'
import { bossAIQuery, playerQuery } from "../../constants/queries.js"
import { Position, Rotation, BossAI, Health } from "../../constants/components.js"
import { getWeapon } from "../config/weapons.js"
import { bossThrowerState } from "../weaponState/bossThrowerState.js"
import { applyStatusEffects } from "../../systems/statusEffectSystem.js"

// Purely visual — cone testing/damage below still uses the centered
// mount point, so gunGap doesn't double boss thrower DPS.
function getTwinOrigins(centerX, centerY, rot, gap) {

    if (!gap) return { ax: centerX, ay: centerY, bx: centerX, by: centerY }

    const perpX = Math.cos(-rot)
    const perpY = -Math.sin(-rot)

    return {
        ax: centerX + perpX * gap,
        ay: centerY + perpY * gap,
        bx: centerX - perpX * gap,
        by: centerY - perpY * gap,
    }
}

export function bossThrowerSystem() {

    const dt = world.time.delta
    const bosses = bossAIQuery()
    const players = playerQuery()

    if (bosses.length === 0 || players.length === 0) {
        bossThrowerState.active = false
        return
    }

    const id = bosses[0]
    const weapon = getWeapon(BossAI.weapon[id])

    if (weapon.category !== "thrower") {
        bossThrowerState.active = false
        return
    }

    const pid = players[0]
    const dx = Position.x[pid] - Position.x[id]
    const dy = Position.y[pid] - Position.y[id]
    const dist = Math.hypot(dx, dy)
    const inRange = dist <= weapon.range

    const emission = getBossEmissionConfig(
        id,
        'thrower'
    )

    const point = getEmissionPoint(
        Position.x[id],
        Position.y[id],
        Rotation[id],
        emission
    )

    bossThrowerState.active = inRange

    bossThrowerState.originX = point.x
    bossThrowerState.originY = point.y

    bossThrowerState.range = weapon.range
    bossThrowerState.length = weapon.range
    bossThrowerState.coneAngle = weapon.coneAngle ?? 0.5

    // Add `gunGap` to this boss's 'thrower' emission config to split
    // the stream into two parallel visual jets.
    const gap = emission.gunGap ?? 0
    const twin = getTwinOrigins(point.x, point.y, Rotation[id], gap)

    bossThrowerState.originAX = twin.ax
    bossThrowerState.originAY = twin.ay
    bossThrowerState.originBX = twin.bx
    bossThrowerState.originBY = twin.by

    if (!inRange || dist < 0.001) {
        bossThrowerState.dirX = 0
        bossThrowerState.dirY = 0
        return
    }

    bossThrowerState.dirX = dx / dist
    bossThrowerState.dirY = dy / dist

    Health.current[pid] -=
        weapon.directDamage * dt

    applyStatusEffects(pid, weapon)

}