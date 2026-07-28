// src/ecs/weapons/weaponSystems/laserSystem.js

import { world } from "../../constants/world.js"
import { playerQuery, bossQuery } from "../../constants/queries.js"
import { Position, Rotation, Health } from "../../constants/components.js"
import { input } from "../../systems/input.js"
import { gameState } from "../../../state/gameState.js"
import { getWeapon } from "../config/weapons.js"
import { laserState } from "../weaponState/laserState.js"

import { killAsteroid, killBoss } from "../../systems/entityDeath.js"
import { activeAsteroids } from "../../pools/asteroidPool.js"
import { pushArc } from "../weaponState/arcState.js"

import { emitEffect } from "../../../fx/effects.js"
import { EFFECT } from "../../../fx/FXTypes.js"

const ASTEROID_RADIUS = 0.7
const BOSS_RADIUS = 2.0

function findNearestHit(list, radius, originX, originY, dirX, dirY, maxT) {

    let bestT = maxT
    let bestId = -1

    for (let i = 0; i < list.length; i++) {

        const eid = list[i]
        const cx = Position.x[eid] - originX
        const cy = Position.y[eid] - originY

        const t = cx * dirX + cy * dirY
        if (t < 0 || t > bestT) continue

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

function resolveBeam(originX, originY, dirX, dirY, weapon, dps, asteroids, bosses) {

    const asteroidHit = findNearestHit(asteroids, ASTEROID_RADIUS, originX, originY, dirX, dirY, weapon.range)
    const bossHit = findNearestHit(bosses, BOSS_RADIUS, originX, originY, dirX, dirY, asteroidHit.id !== -1 ? asteroidHit.t : weapon.range)

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

    const hitX = originX + dirX * hitT
    const hitY = originY + dirY * hitT

    let alive = true

    if (hitId !== -1) {

        Health.current[hitId] -= dps * world.time.delta

        if (Health.current[hitId] <= 0) {
            alive = false
            if (hitType === "asteroid") killAsteroid(hitId, hitX, hitY)
            else killBoss(hitId, hitX, hitY)
        }
    }

    return { hitId, hitType, hitT, hitX, hitY, alive }
}

export function laserSystem() {

    const dt = world.time.delta
    const weapon = getWeapon(gameState.currentWeapon)

    if (weapon.category !== "beam") {
        laserState.active = false
        laserState.lockTargetId = -1
        laserState.lockTime = 0
        return
    }

    const players = playerQuery()
    if (players.length === 0 || !input.fire) {
        laserState.active = false
        laserState.lockTargetId = -1
        laserState.lockTime = 0
        return
    }

    const pid = players[0]

    laserState.active = true
    laserState.originX = Position.x[pid]
    laserState.originY = Position.y[pid]

    const baseDirX = Math.sin(-Rotation[pid])
    const baseDirY = Math.cos(-Rotation[pid])

    const asteroids = activeAsteroids
    const bosses = bossQuery()

    const beamCount = weapon.beamCount ?? 1
    const beamSpread = weapon.beamSpread ?? 0

    laserState.beamCount = beamCount

    let primaryHitId = -1
    let primaryHitX = laserState.originX
    let primaryHitY = laserState.originY

    const chainHitPoints = []

    for (let i = 0; i < beamCount; i++) {

        const angleOffset = beamCount > 1
            ? -beamSpread / 2 + (beamSpread / (beamCount - 1)) * i
            : 0

        const cos = Math.cos(angleOffset)
        const sin = Math.sin(angleOffset)
        const dirX = baseDirX * cos - baseDirY * sin
        const dirY = baseDirX * sin + baseDirY * cos

        // -------------------------

        let dps = weapon.damagePerSecond

        if (weapon.rampTime && beamCount === 1) {

            const asteroidHit = findNearestHit(asteroids, ASTEROID_RADIUS, laserState.originX, laserState.originY, dirX, dirY, weapon.range)
            const bossHit = findNearestHit(bosses, BOSS_RADIUS, laserState.originX, laserState.originY, dirX, dirY, asteroidHit.id !== -1 ? asteroidHit.t : weapon.range)
            const targetId = bossHit.id !== -1 ? bossHit.id : asteroidHit.id

            if (targetId !== -1 && targetId === laserState.lockTargetId) {
                laserState.lockTime = Math.min(laserState.lockTime + dt, weapon.rampTime)
            } else {
                laserState.lockTargetId = targetId
                laserState.lockTime = 0
            }

            const t = laserState.lockTime / weapon.rampTime
            dps = weapon.damagePerSecond + (weapon.maxDamagePerSecond - weapon.damagePerSecond) * t
        }

        const result = resolveBeam(laserState.originX, laserState.originY, dirX, dirY, weapon, dps, asteroids, bosses)

        laserState.dirX[i] = dirX
        laserState.dirY[i] = dirY
        laserState.hitT[i] = result.hitT
        laserState.hitX[i] = result.hitX
        laserState.hitY[i] = result.hitY
        laserState.hitActive[i] = result.hitId !== -1

        if (i === 0) {
            primaryHitId = result.hitId
            primaryHitX = result.hitX
            primaryHitY = result.hitY
        }

        // -------------------------

        if (weapon.chainCount && result.hitType === "asteroid" && result.alive) {

            const chainRangeSq = weapon.chainRange * weapon.chainRange
            const chainDps = weapon.chainDamagePerSecond ?? weapon.damagePerSecond * 0.4

            const used = new Set([result.hitId])

            let chainX = result.hitX
            let chainY = result.hitY

            for (let chain = 0; chain < weapon.chainCount; chain++) {

                let bestId = -1
                let bestDistSq = chainRangeSq

                // Find nearest unused asteroid
                for (let k = 0; k < asteroids.length; k++) {

                    const aid = asteroids[k]

                    if (used.has(aid))
                        continue

                    const dx = Position.x[aid] - chainX
                    const dy = Position.y[aid] - chainY
                    const distSq = dx * dx + dy * dy

                    if (distSq < bestDistSq) {
                        bestDistSq = distSq
                        bestId = aid
                    }
                }

                if (bestId === -1)
                    break

                used.add(bestId)

                const secX = Position.x[bestId]
                const secY = Position.y[bestId]

                Health.current[bestId] -= chainDps * dt

                pushArc([{ x: chainX, y: chainY }, { x: secX, y: secY }], 0.12)

                if (Health.current[bestId] <= 0) {
                    killAsteroid(bestId, secX, secY)
                } else {
                    chainHitPoints.push({ x: secX, y: secY })
                }

                chainX = secX
                chainY = secY
            }
        }
    }

    laserState.hitLegacy = primaryHitId !== -1
    laserState.hitXLegacy = primaryHitX
    laserState.hitYLegacy = primaryHitY

    laserState.length = beamCount > 0
        ? laserState.hitT[0]
        : weapon.range

    laserState.sparkTimer -= dt

    if (laserState.sparkTimer <= 0) {

        for (let i = 0; i < laserState.beamCount; i++) {

            if (!laserState.hitActive[i]) continue

            emitEffect(EFFECT.SPARK_BURST, {
                x: laserState.hitX[i],
                y: laserState.hitY[i],
                count: 6,
                speed: 4,
            })
        }

        for (const p of chainHitPoints) {
            emitEffect(EFFECT.SPARK_BURST, { x: p.x, y: p.y, count: 4, speed: 3 })
        }

        laserState.sparkTimer = weapon.tickSparkInterval
    }
}