// src/ecs/systems/laserSystem.js

import { removeEntity } from "bitecs"
import { world } from "../constants/world.js"
import { playerQuery, asteroidQuery, bossQuery } from "../constants/queries.js"
import { Position, Rotation, Health } from "../constants/components.js"
import { input } from "./input.js"
import { gameState } from "../../state/gameState.js"
import { getWeapon } from "../constants/weapons.js"
import { laserState } from "../../state/laserState.js"
import { spawnSparkBurst } from "../spawn.js"

const ASTEROID_RADIUS = 0.7
const BOSS_RADIUS = 2.0

function findNearestHit(list, radius, originX, originY, dirX, dirY, maxT) {

    let bestT = maxT
    let bestId = -1

    for (let i = 0; i < list.length; i++) {

        const eid = list[i]
        const cx = Position.x[eid] - originX
        const cy = Position.y[eid] - originY

        const t = cx * dirX + cy * dirY          // projection of target onto beam direction
        if (t < 0 || t > bestT) continue          // behind ship, or farther than current closest hit

        const closestX = dirX * t
        const closestY = dirY * t
        const dx = cx - closestX
        const dy = cy - closestY

        if (dx * dx + dy * dy <= radius * radius) {
            bestT = t
            bestId = eid
        }
    }

    return { t: bestT, id: bestId }
}

export function laserSystem() {

    const dt = world.time.delta
    const weapon = getWeapon(gameState.currentWeapon)

    if (!weapon.isBeam) {
        laserState.active = false
        return
    }

    const players = playerQuery()
    if (players.length === 0 || !input.fire) {
        laserState.active = false
        return
    }

    const pid = players[0]

    laserState.active = true
    laserState.originX = Position.x[pid]
    laserState.originY = Position.y[pid]

    const dirX = Math.sin(-Rotation[pid])
    const dirY = Math.cos(-Rotation[pid])

    // -------------------------
    // Find nearest hit along the beam (boss takes priority if closer than any asteroid)
    // -------------------------

    const asteroidHit = findNearestHit(asteroidQuery(), ASTEROID_RADIUS, laserState.originX, laserState.originY, dirX, dirY, weapon.range)
    const bossHit = findNearestHit(bossQuery(), BOSS_RADIUS, laserState.originX, laserState.originY, dirX, dirY, asteroidHit.id !== -1 ? asteroidHit.t : weapon.range)

    let hitId = -1
    let hitType = null
    let hitT = weapon.range

    if (bossHit.id !== -1) {
        hitId = bossHit.id
        hitType = "boss"
        hitT = bossHit.t
    } else if (asteroidHit.id !== -1) {
        hitId = asteroidHit.id
        hitType = "asteroid"
        hitT = asteroidHit.t
    }

    laserState.length = hitT
    laserState.hit = hitId !== -1
    laserState.hitX = laserState.originX + dirX * hitT
    laserState.hitY = laserState.originY + dirY * hitT

    if (hitId === -1) return

    // -------------------------
    // Damage + hit sparks (ticks continuously while beam stays on target)
    // -------------------------

    Health.current[hitId] -= weapon.damagePerSecond * dt

    laserState.sparkTimer -= dt
    if (laserState.sparkTimer <= 0) {
        spawnSparkBurst(laserState.hitX, laserState.hitY, { count: 6, speed: 4 })
        laserState.sparkTimer = weapon.tickSparkInterval
    }

    if (Health.current[hitId] <= 0) {

        removeEntity(world, hitId)

        if (hitType === "asteroid") {
            gameState.asteroidsRemaining--
            gameState.score += 100
            spawnSparkBurst(laserState.hitX, laserState.hitY, { count: 45, speed: 13, big: true })
        } else {
            gameState.score += 1000
            gameState.bossAlive = false
            gameState.asteroidsRemaining = 0
            spawnSparkBurst(laserState.hitX, laserState.hitY, { count: 90, speed: 16, big: true })
        }
    }
}