// src/ecs/weapons/weaponSystems/bossThrowerSystem.js

import { world } from "../../constants/world.js"

import {
    getEmissionPoint,
    getBossEmissionConfig,
} from "../../constants/emission.js"

import {
    bossAIQuery,
    playerQuery,
} from "../../constants/queries.js"

import {
    Position,
    Rotation,
    BossAI,
    Health,
    BossType,
} from "../../constants/components.js"

import { getWeapon } from "../config/weapons.js"
import { bossThrowerState } from "../weaponState/bossThrowerState.js"
import { applyStatusEffects } from "../../systems/statusEffectSystem.js"

// ============================================================
// TWIN-GUN MUZZLE OFFSET
// ============================================================

function getTwinOrigins(centerX, centerY, rot, gap) {

    if (!gap) {
        return {
            ax: centerX,
            ay: centerY,
            bx: centerX,
            by: centerY,
        }
    }

    const perpX = Math.cos(-rot)
    const perpY = -Math.sin(-rot)

    return {
        ax: centerX + perpX * gap,
        ay: centerY + perpY * gap,
        bx: centerX - perpX * gap,
        by: centerY - perpY * gap,
    }
}

// ============================================================
// CONE COLLISION
// ============================================================

function inCone(
    originX,
    originY,
    dirX,
    dirY,
    coneAngle,
    range,
    targetX,
    targetY,
    targetRadius
) {

    const dx = targetX - originX
    const dy = targetY - originY

    const dist = Math.hypot(dx, dy)

    if (dist > range + targetRadius) {
        return false
    }

    if (dist < 0.001) {
        return true
    }

    const nx = dx / dist
    const ny = dy / dist

    const dot = Math.min(1, Math.max(-1, nx * dirX + ny * dirY))
    const angle = Math.acos(dot)
    const angularRadius = Math.atan2(targetRadius, dist)

    return angle <= coneAngle / 2 + angularRadius
}

// ============================================================
// CONVENTIONAL BOSS THROWER
// ============================================================

function updateBossThrower(dt, bosses, pid) {

    let selectedBoss = -1

    // Find a boss with a thrower weapon.
    // The central octopus is deliberately excluded.

    for (let i = 0; i < bosses.length; i++) {

        const id = bosses[i]

        const weapon = getWeapon(BossAI.weapon[id])

        if (weapon?.category !== "thrower") {
            continue
        }

        selectedBoss = id
        break
    }

    if (selectedBoss === -1) {

        bossThrowerState.active = false
        return
    }

    const id = selectedBoss
    const weapon = getWeapon(BossAI.weapon[id])

    const dx = Position.x[pid] - Position.x[id]
    const dy = Position.y[pid] - Position.y[id]

    const dist = Math.hypot(dx, dy)
    const inRange = dist <= weapon.range

    const emission = getBossEmissionConfig(id, "thrower")

    const point = getEmissionPoint(Position.x[id], Position.y[id], Rotation[id], emission)

    bossThrowerState.active = inRange

    bossThrowerState.originX = point.x
    bossThrowerState.originY = point.y

    bossThrowerState.range = weapon.range
    bossThrowerState.length = weapon.range
    bossThrowerState.coneAngle = weapon.coneAngle ?? 0.5

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

    Health.current[pid] -= weapon.directDamage * dt

    applyStatusEffects(pid, weapon)
}

// ============================================================
// MAIN THROWER SYSTEM
// ============================================================

export function bossThrowerSystem() {

    const dt = world.time.delta

    const bosses = bossAIQuery()
    const players = playerQuery()

    if (players.length === 0) {

        bossThrowerState.active = false

        return
    }

    const pid = players[0]

    // Conventional bosses retain their existing throwers.
    updateBossThrower(dt, bosses, pid)

}
