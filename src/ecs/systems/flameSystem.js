// src/ecs/systems/flameSystem.js

import { world } from "../constants/world.js"
import { playerQuery, asteroidQuery, bossQuery } from "../constants/queries.js"
import { Position, Rotation, Health } from "../constants/components.js"
import { input } from "./input.js"
import { gameState } from "../../state/gameState.js"
import { getWeapon } from "../constants/weapons.js"
import { flameState } from "../../state/flameState.js"
import { spawnSparkBurst } from "../spawn.js"
import { killAsteroid, killBoss } from "./entityDeath.js"

export function flameSystem() {

    const dt = world.time.delta
    const weapon = getWeapon(gameState.currentWeapon)

    if (weapon.category !== "flame") {
        flameState.active = false
        return
    }

    const players = playerQuery()
    if (players.length === 0 || !input.fire) {
        flameState.active = false
        return
    }

    const pid = players[0]

    flameState.active = true
    flameState.originX = Position.x[pid]
    flameState.originY = Position.y[pid]
    flameState.dirX = Math.sin(-Rotation[pid])
    flameState.dirY = Math.cos(-Rotation[pid])
    flameState.range = weapon.range
    flameState.coneAngle = weapon.coneAngle

    const halfAngle = weapon.coneAngle / 2
    const hitIds = []

    // -------------------------
    // Sweep both asteroids and bosses for anything inside the cone
    // -------------------------

    function checkList(list, isBoss) {

        for (let i = 0; i < list.length; i++) {

            const eid = list[i]
            const dx = Position.x[eid] - flameState.originX
            const dy = Position.y[eid] - flameState.originY
            const dist = Math.hypot(dx, dy)

            if (dist > weapon.range || dist < 0.001) continue

            // angle between the ship's facing direction and this target
            const nx = dx / dist
            const ny = dy / dist
            const dot = nx * flameState.dirX + ny * flameState.dirY
            const angle = Math.acos(Math.min(1, Math.max(-1, dot)))

            if (angle > halfAngle) continue   // outside the cone

            // damage falls off linearly with distance — full DPS at point-blank, ~0 at max range
            const falloff = 1 - (dist / weapon.range)
            const dps = weapon.damagePerSecond * falloff

            Health.current[eid] -= dps * dt
            hitIds.push(eid)

            if (Health.current[eid] <= 0) {
                if (isBoss) killBoss(eid, Position.x[eid], Position.y[eid])
                else killAsteroid(eid, Position.x[eid], Position.y[eid])
            }
        }
    }

    checkList(asteroidQuery(), false)
    checkList(bossQuery(), true)

    flameState.hitIds = hitIds

    // -------------------------
    // Periodic sparks on everything currently burning
    // -------------------------

    flameState.sparkTimer -= dt
    if (flameState.sparkTimer <= 0) {
        for (let i = 0; i < hitIds.length; i++) {
            const eid = hitIds[i]
            spawnSparkBurst(Position.x[eid], Position.y[eid], { count: 4, speed: 3 })
        }
        flameState.sparkTimer = weapon.tickSparkInterval
    }
}