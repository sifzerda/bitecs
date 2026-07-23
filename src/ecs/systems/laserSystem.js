// src/ecs/systems/laserSystem.js

import { world } from "../constants/world.js"
import { playerQuery, bossQuery } from "../constants/queries.js"
import { Position, Rotation, Health } from "../constants/components.js"
import { input } from "./input.js"
import { gameState } from "../../state/gameState.js"
import { getWeapon } from "../constants/weapons.js"
import { laserState } from "../../state/laserState.js"
 
import { killAsteroid, killBoss } from "./entityDeath.js"
import { activeAsteroids } from "../pools/asteroidPool"

import { emitEffect } from "../../fx/effects.js"
import { EFFECT } from "../../fx/FXTypes.js"

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

// Resolves a single beam along one direction, applies damage, returns hit info
// for the renderer. dps is passed in explicitly so the ramp calculation
// (which only applies to the single-beam case) stays out of this shared helper.
// Also reports hitType and whether the target survived the frame's damage —
// both needed by the arc gun's chain-lightning logic.
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

    laserState.hits = []   // renderer draws one line per entry

    let primaryHitId = -1
    let primaryHitX = laserState.originX
    let primaryHitY = laserState.originY

    // secondary chain hit positions collected this frame — used below to
    // throttle spark bursts to the same cadence as the primary beam's ticks
    const chainHitPoints = []

    for (let i = 0; i < beamCount; i++) {

        const angleOffset = beamCount > 1
            ? -beamSpread / 2 + (beamSpread / (beamCount - 1)) * i
            : 0

        // rotate the base direction by angleOffset
        const cos = Math.cos(angleOffset)
        const sin = Math.sin(angleOffset)
        const dirX = baseDirX * cos - baseDirY * sin
        const dirY = baseDirX * sin + baseDirY * cos

        // -------------------------
        // Ramp-up only applies to single-beam weapons locked on one target.
        // Prism's multiple simultaneous beams don't ramp — keeps the two
        // mechanics from having to interact with each other.
        // -------------------------

        let dps = weapon.damagePerSecond

        if (weapon.rampTime && beamCount === 1) {

            // peek at what this beam is about to hit, before applying damage,
            // so the ramp can check "is this the same target as last frame"
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

        laserState.hits.push({ dirX, dirY, hitT: result.hitT, hitX: result.hitX, hitY: result.hitY, hit: result.hitId !== -1 })

        if (i === 0) {
            primaryHitId = result.hitId
            primaryHitX = result.hitX
            primaryHitY = result.hitY
        }

        // -------------------------

        if (weapon.chainCount && result.hitType === "asteroid" && result.alive) {

            const chainRangeSq = weapon.chainRange * weapon.chainRange
            const candidates = []

            for (let k = 0; k < asteroids.length; k++) {
                const aid = asteroids[k]
                if (aid === result.hitId) continue

                const dx = Position.x[aid] - result.hitX
                const dy = Position.y[aid] - result.hitY
                const distSq = dx * dx + dy * dy

                if (distSq <= chainRangeSq) {
                    candidates.push({ id: aid, distSq })
                }
            }

            candidates.sort((a, b) => a.distSq - b.distSq)

            const chainDps = weapon.chainDamagePerSecond ?? weapon.damagePerSecond * 0.4
            const chainLimit = Math.min(weapon.chainCount, candidates.length)

            for (let k = 0; k < chainLimit; k++) {

                const secId = candidates[k].id
                const secX = Position.x[secId]
                const secY = Position.y[secId]

                Health.current[secId] -= chainDps * dt

                // short-lived flickering link — refreshed every frame while
                // the chain is active, giving a live "arcing electricity" look
                pushArc([{ x: result.hitX, y: result.hitY }, { x: secX, y: secY }], 0.12)

                if (Health.current[secId] <= 0) {
                    killAsteroid(secId, secX, secY)
                } else {
                    chainHitPoints.push({ x: secX, y: secY })
                }
            }
        }
    }

    // keep legacy single-hit fields alive for anything still reading laserState.hit/hitX/hitY
    // directly (e.g. an older renderer) — remove once the renderer is updated to use laserState.hits
    laserState.hit = primaryHitId !== -1
    laserState.hitX = primaryHitX
    laserState.hitY = primaryHitY
    laserState.length = laserState.hits[0]?.hitT ?? weapon.range

    laserState.sparkTimer -= dt

if (laserState.sparkTimer <= 0) {

    for (const h of laserState.hits) {

        if (h.hit) {

            emitEffect(EFFECT.SPARK_BURST, {
                x: h.hitX,
                y: h.hitY,
                count: 6,
                speed: 4,
            })

        }

    }

    for (const p of chainHitPoints) {

        emitEffect(EFFECT.SPARK_BURST, {
            x: p.x,
            y: p.y,
            count: 4,
            speed: 3,
        })

    }

    laserState.sparkTimer = weapon.tickSparkInterval
}
}