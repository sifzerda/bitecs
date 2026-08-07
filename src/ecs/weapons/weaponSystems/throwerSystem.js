// src/ecs/weapons/weaponSystems/throwerSystem.js

import { world } from "../../constants/world.js"
import { getEmissionPoint, PLAYER_CONFIG } from '../../constants/emission.js'
import { playerQuery, bossQuery } from "../../constants/queries.js"
import { Position, Rotation, Health, StatusEffect } from "../../constants/components.js"

import { input } from "../../systems/input.js"
import { gameState } from "../../../state/gameState.js"
import { getWeapon } from "../config/weapons.js"
import { throwerState } from "../weaponState/throwerState.js"
import { spawnHazard } from "../../spawn.js"
import { killAsteroid, killBoss } from "../../systems/entityDeath.js"
import { activeAsteroids } from "../../pools/asteroidPool.js"

import { emitEffect } from "../../../fx/effects.js"
import { EFFECT } from "../../../fx/FXTypes.js"

const ASTEROID_RADIUS = 0.7
const BOSS_RADIUS = 2.0

// returns true if targetX/Y (with its own radius) falls inside the cone
function inCone(originX, originY, dirX, dirY, coneAngle, range, targetX, targetY, targetRadius) {

    const dx = targetX - originX
    const dy = targetY - originY
    const dist = Math.hypot(dx, dy)

    if (dist > range + targetRadius) return false
    if (dist < 0.001) return true

    const nx = dx / dist
    const ny = dy / dist
    const dot = Math.min(1, Math.max(-1, nx * dirX + ny * dirY))
    const angle = Math.acos(dot)

    // widen the effective half-angle a bit so large targets near the edge still register
    const angularRadius = Math.atan2(targetRadius, dist)

    return angle <= coneAngle / 2 + angularRadius
}

export function throwerSystem() {

    const dt = world.time.delta
    const weapon = getWeapon(gameState.currentWeapon)

    if (weapon.category !== "thrower") {
        throwerState.active = false
        throwerState.hitIds = []
        return
    }

    const players = playerQuery()
    if (players.length === 0 || !input.fire) {
        throwerState.active = false
        throwerState.hitIds = []
        return
    }

    const pid = players[0]

    const point = getEmissionPoint(
        Position.x[player],
        Position.y[player],
        Rotation[player],
        PLAYER_CONFIG.emission.thrower
    )

    throwerState.active = true

    throwerState.originX = point.x
    throwerState.originY = point.y

    throwerState.dirX = Math.sin(-Rotation[pid])
    throwerState.dirY = Math.cos(-Rotation[pid])
    throwerState.coneAngle = weapon.coneAngle ?? 0.5
    throwerState.range = weapon.range
    throwerState.length = weapon.range // kept for anything still reading .length

    const asteroids = activeAsteroids
    const bosses = bossQuery()
    const dps = weapon.damagePerSecond
    const hitIds = []

    for (let i = 0; i < asteroids.length; i++) {
        const aid = asteroids[i]
        if (!inCone(throwerState.originX, throwerState.originY, throwerState.dirX, throwerState.dirY,
            throwerState.coneAngle, weapon.range, Position.x[aid], Position.y[aid], ASTEROID_RADIUS)) continue

        hitIds.push(aid)
        Health.current[aid] -= dps * dt
        if (weapon.freezeDuration) StatusEffect.frozen[aid] = weapon.freezeDuration

        if (Health.current[aid] <= 0) killAsteroid(aid, Position.x[aid], Position.y[aid])
    }

    for (let i = 0; i < bosses.length; i++) {
        const bossId = bosses[i]
        if (!inCone(throwerState.originX, throwerState.originY, throwerState.dirX, throwerState.dirY,
            throwerState.coneAngle, weapon.range, Position.x[bossId], Position.y[bossId], BOSS_RADIUS)) continue

        hitIds.push(bossId)
        Health.current[bossId] -= dps * dt
        if (weapon.freezeDuration) StatusEffect.frozen[bossId] = weapon.freezeDuration

        if (Health.current[bossId] <= 0) killBoss(bossId, Position.x[bossId], Position.y[bossId])
    }

    throwerState.hitIds = hitIds

    throwerState.sparkTimer -= dt

    if (throwerState.sparkTimer <= 0) {

        for (const eid of hitIds) {
            emitEffect(EFFECT.SPARK_BURST, { x: Position.x[eid], y: Position.y[eid], count: 4, speed: 3 })
        }

        // acid-style weapons leave a lingering puddle roughly where the spray lands
        if (weapon.leavesHazard) {
            const midX = throwerState.originX + throwerState.dirX * weapon.range * 0.6
            const midY = throwerState.originY + throwerState.dirY * weapon.range * 0.6
            spawnHazard(midX, midY, weapon.id, 0, -1)
        }

        throwerState.sparkTimer = weapon.tickSparkInterval ?? 0.1
    }
}