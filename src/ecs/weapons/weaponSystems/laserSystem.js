// src/ecs/weapons/weaponSystems/laserSystem.js

import { world } from "../../constants/world.js"
import { playerQuery, bossQuery } from "../../constants/queries.js"
import { Position, Rotation, Health } from "../../constants/components.js"
import { getEmissionPoint, PLAYER_CONFIG } from '../../constants/emission.js'

import { input } from "../../systems/input.js"
import { simState } from "../../../state/simState.js"
import { getWeapon } from "../config/weapons.js"
import { laserState } from "../weaponState/laserState.js"

import { killAsteroid, killBoss } from "../../systems/entityDeath.js"
import { activeAsteroids } from "../../pools/asteroidPool.js"
import { pushArc } from "../weaponState/arcState.js"

import { emitEffect } from "../../../fx/effects.js"
import { EFFECT } from "../../../fx/FXTypes.js"

const ASTEROID_RADIUS = 0.7
const BOSS_RADIUS = 2.0
const MAX_BEAMS = 16

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

// --------------------------------------------------------
// Twin-gun muzzle offset
//
// Mirrors the perpendicular offset math spawnBullet/spawnPlayerBullet
// use for twin bullet guns: the two muzzles sit gunGap either side of
// the ship's centerline, perpendicular to its facing direction.
//
// Purely visual — hit detection below still raycasts from the single
// centered muzzle point, so adding gunGap does NOT double beam DPS.
// --------------------------------------------------------

function getTwinOrigins(centerX, centerY, rot, gap) {

    if (!gap) return [{ x: centerX, y: centerY }]

    const perpX = Math.cos(-rot)
    const perpY = -Math.sin(-rot)

    return [
        { x: centerX + perpX * gap, y: centerY + perpY * gap },
        { x: centerX - perpX * gap, y: centerY - perpY * gap },
    ]
}

export function laserSystem() {

    const dt = world.time.delta
    const weapon = getWeapon(simState.currentWeapon)

    if (weapon.category !== "beam") {
        laserState.active = false
        laserState.lockTargetId = -1
        laserState.lockTime = 0
        laserState.beamCount = 0
        return
    }

    const players = playerQuery()
    if (players.length === 0 || !input.fire) {
        laserState.active = false
        laserState.lockTargetId = -1
        laserState.lockTime = 0
        laserState.beamCount = 0
        return
    }

    const pid = players[0]

    const emissionCfg = PLAYER_CONFIG.emission.beam

    const point = getEmissionPoint(
        Position.x[pid],
        Position.y[pid],
        Rotation[pid],
        emissionCfg
    )

    laserState.active = true

    const centerX = point.x
    const centerY = point.y

    const baseDirX = Math.sin(-Rotation[pid])
    const baseDirY = Math.cos(-Rotation[pid])

    const asteroids = activeAsteroids
    const bosses = bossQuery()

    const beamCount = weapon.beamCount ?? 1
    const beamSpread = weapon.beamSpread ?? 0

    // Add `gunGap` to PLAYER_CONFIG.emission.beam in emission.js to
    // split each fanned beam into two parallel visual streams.
    const gap = emissionCfg.gunGap ?? 0
    const origins = getTwinOrigins(centerX, centerY, Rotation[pid], gap)

    let outIndex = 0
    let primaryHitId = -1
    let primaryHitX = centerX
    let primaryHitY = centerY

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
        // Damage / ramp-up — single raycast from the centered muzzle
        // point, unaffected by gunGap.
        // -------------------------

        let dps = weapon.directDamage

        if (weapon.rampTime && beamCount === 1) {

            const asteroidHit = findNearestHit(asteroids, ASTEROID_RADIUS, centerX, centerY, dirX, dirY, weapon.range)
            const bossHit = findNearestHit(bosses, BOSS_RADIUS, centerX, centerY, dirX, dirY, asteroidHit.id !== -1 ? asteroidHit.t : weapon.range)
            const targetId = bossHit.id !== -1 ? bossHit.id : asteroidHit.id

            if (targetId !== -1 && targetId === laserState.lockTargetId) {
                laserState.lockTime = Math.min(laserState.lockTime + dt, weapon.rampTime)
            } else {
                laserState.lockTargetId = targetId
                laserState.lockTime = 0
            }

            const t = laserState.lockTime / weapon.rampTime
            dps = weapon.directDamage + (weapon.maxDamage - weapon.directDamage) * t
        }

        const result = resolveBeam(centerX, centerY, dirX, dirY, weapon, dps, asteroids, bosses)

        if (i === 0) {
            primaryHitId = result.hitId
            primaryHitX = result.hitX
            primaryHitY = result.hitY
        }

        // -------------------------
        // Emit one visual beam entry per muzzle (1 or 2), sharing this
        // fan beam's direction/hitT/hit-status but drawn from its own
        // origin so twin beams render parallel.
        // -------------------------

        for (let o = 0; o < origins.length && outIndex < MAX_BEAMS; o++) {

            const origin = origins[o]

            laserState.originX[outIndex] = origin.x
            laserState.originY[outIndex] = origin.y
            laserState.dirX[outIndex] = dirX
            laserState.dirY[outIndex] = dirY
            laserState.hitT[outIndex] = result.hitT
            laserState.hitX[outIndex] = origin.x + dirX * result.hitT
            laserState.hitY[outIndex] = origin.y + dirY * result.hitT
            laserState.hitActive[outIndex] = result.hitId !== -1

            outIndex++
        }

        // -------------------------
        // Chain lightning (unchanged — still keyed off the single
        // centered raycast result, not per visual beam)
        // -------------------------

        if (weapon.chainCount && result.hitType === "asteroid" && result.alive) {

            const chainRangeSq = weapon.chainRange * weapon.chainRange
            const chainDps = weapon.chainDamage ?? weapon.directDamage * 0.4

            const used = new Set([result.hitId])

            let chainX = result.hitX
            let chainY = result.hitY

            for (let chain = 0; chain < weapon.chainCount; chain++) {

                let bestId = -1
                let bestDistSq = chainRangeSq

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

    laserState.beamCount = outIndex

    laserState.hitLegacy = primaryHitId !== -1
    laserState.hitXLegacy = primaryHitX
    laserState.hitYLegacy = primaryHitY

    laserState.length = outIndex > 0
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