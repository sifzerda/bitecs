//src/ecs/systems/bossThrowerSystem.js

import { world } from "../constants/world.js"
import { bossAIQuery, playerQuery } from "../constants/queries.js"
import { Position, BossAI, Health, StatusEffect } from "../constants/components.js"
import { getWeapon } from "../constants/weapons.js"
import { bossThrowerState } from "../../state/bossThrowerState.js"

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

    bossThrowerState.active = inRange
    bossThrowerState.originX = Position.x[id]
    bossThrowerState.originY = Position.y[id]
    bossThrowerState.range = weapon.range
    bossThrowerState.length = weapon.range
    bossThrowerState.coneAngle = weapon.coneAngle ?? 0.5

    if (!inRange || dist < 0.001) {
        bossThrowerState.dirX = 0
        bossThrowerState.dirY = 0
        return
    }

    bossThrowerState.dirX = dx / dist
    bossThrowerState.dirY = dy / dist

    Health.current[pid] -= weapon.damagePerSecond * dt
    if (weapon.freezeDuration) StatusEffect.frozen[pid] = weapon.freezeDuration
}