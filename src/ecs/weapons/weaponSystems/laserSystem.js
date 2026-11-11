// src/ecs/weapons/weaponSystems/laserSystem.js

import { BOSSES } from "../../constants/bosses.js"
import { world } from "../../constants/world.js"
import {
    playerQuery,
    bossQuery,
} from "../../constants/queries.js"

import {
    Position,
    Rotation,
    Health,
    Asteroid,
    BossType,
} from "../../constants/components.js"

import {
    getEmissionPoint,
    PLAYER_CONFIG,
} from "../../constants/emission.js"

import {
    raycastAsteroids,
    forEachAsteroidNear,
} from "../../constants/spatialGrid.js"

import { input } from "../../systems/input.js"
import { startState } from "../../../state/startState.js"
import { getWeapon } from "../config/weapons.js"
import { laserState } from "../weaponState/laserState.js"

import {
    killAsteroid,
    killBoss,
} from "../../systems/entityDeath.js"

import { emitEffect } from "../../../fx/effects.js"
import { EFFECT } from "../../../fx/FXTypes.js"

import {
    registerAsteroidImpact,
} from "../../combat/impactFeedback.js"

// ============================================================
// CONFIGURATION
// ============================================================

const MAX_BEAMS = 16
const DEFAULT_BOSS_RADIUS = 2
const EPSILON = 1e-9

// Reused chain-target tracking.
// Versions protect against recycled asteroid entities.
const chainStamps = new Uint32Array(Position.x.length)
const chainVersions = new Uint32Array(Position.x.length)

let chainStamp = 0

function nextChainStamp() {
    chainStamp = (chainStamp + 1) >>> 0

    if (chainStamp === 0) {
        chainStamps.fill(0)
        chainStamp = 1
    }

    return chainStamp
}

function markChainTarget(id, stamp) {
    chainStamps[id] = stamp
    chainVersions[id] = Asteroid.spawnVersion[id]
}

function wasChainTarget(id, stamp) {
    return (
        chainStamps[id] === stamp &&
        chainVersions[id] === Asteroid.spawnVersion[id]
    )
}

// ============================================================
// REUSABLE SCRATCH RESULTS
// ============================================================

const hitResult = {
    id: -1,
    type: null,
    t: 0,
    x: 0,
    y: 0,
}

const beamResult = {
    id: -1,
    type: null,
    t: 0,
    x: 0,
    y: 0,
    alive: true,
}

// ============================================================
// BOSS RAYCAST
// ============================================================

// Bosses remain a small collection, so a direct scan is
// cheaper than introducing another broad-phase structure.
//
// The asteroid raycast is performed first, allowing this
// function to stop at the nearest asteroid distance.

function raycastBosses(
    bosses,
    originX,
    originY,
    dirX,
    dirY,
    maxDistance
) {
    let bestId = -1
    let bestT = maxDistance

    for (let i = 0; i < bosses.length; i++) {
        const id = bosses[i]

        if (Health.current[id] <= 0) continue

        const radius =
            BOSSES[BossType.typeIndex[id]]?.hitRadius ??
            DEFAULT_BOSS_RADIUS

        const ox = Position.x[id] - originX
        const oy = Position.y[id] - originY

        const projection = ox * dirX + oy * dirY

        const centerDistSq = ox * ox + oy * oy
        const radiusSq = radius * radius

        const perpendicularSq = Math.max(
            0,
            centerDistSq - projection * projection
        )

        if (perpendicularSq > radiusSq) continue

        const offset = Math.sqrt(
            Math.max(0, radiusSq - perpendicularSq)
        )

        const t = centerDistSq <= radiusSq
            ? 0
            : projection - offset

        if (t < 0 || t > bestT) continue

        bestT = t
        bestId = id
    }

    return {
        id: bestId,
        t: bestT,
    }
}

// ============================================================
// FIND NEAREST BEAM TARGET
// ============================================================

// One spatial raycast per beam.
// Bosses are compared against the asteroid result.
//
// Result object is reused to avoid per-frame allocation.

function findBeamTarget(
    originX,
    originY,
    dirX,
    dirY,
    range,
    bosses
) {
    const asteroidHit = raycastAsteroids(
        originX,
        originY,
        dirX,
        dirY,
        range
    )

    const asteroidT = asteroidHit?.t ?? range

    const bossHit = raycastBosses(
        bosses,
        originX,
        originY,
        dirX,
        dirY,
        asteroidT
    )

    let id = -1
    let type = null
    let t = range

    if (bossHit.id !== -1) {
        id = bossHit.id
        type = "boss"
        t = bossHit.t
    } else if (asteroidHit) {
        id = asteroidHit.id
        type = "asteroid"
        t = asteroidHit.t
    }

    hitResult.id = id
    hitResult.type = type
    hitResult.t = t

    hitResult.x = originX + dirX * t
    hitResult.y = originY + dirY * t

    return hitResult
}

// ============================================================
// APPLY BEAM DAMAGE
// ============================================================

function applyBeamDamage(
    target,
    dirX,
    dirY,
    dps,
    dt
) {
    const id = target.id

    beamResult.id = id
    beamResult.type = target.type
    beamResult.t = target.t
    beamResult.x = target.x
    beamResult.y = target.y
    beamResult.alive = true

    if (id === -1) return beamResult

    const damage = Math.max(0, dps * dt)

    if (damage <= 0) return beamResult

    Health.current[id] -= damage

    if (target.type === "asteroid") {
        registerAsteroidImpact({
            id,
            damage,
            directionX: dirX,
            directionY: dirY,
            x: target.x,
            y: target.y,
            continuous: true,
            sparks: false,
        })
    }

    if (Health.current[id] <= 0) {
        beamResult.alive = false

        if (target.type === "asteroid") {
            killAsteroid(id, target.x, target.y)
        } else {
            killBoss(id, target.x, target.y)
        }
    }

    return beamResult
}

// ============================================================
// RESET LASER VISUAL STATE
// ============================================================

function deactivateLaser() {
    laserState.active = false
    laserState.lockTargetId = -1
    laserState.lockTime = 0
    laserState.beamCount = 0
    laserState.hitLegacy = false
}

// ============================================================
// MAIN LASER SYSTEM
// ============================================================

export function laserSystem() {
    const dt = world.time.delta

    const weapon = getWeapon(
        startState.currentWeapon
    )

    if (
        !weapon ||
        weapon.category !== "beam" ||
        startState.encounterPhase !== "active"
    ) {
        deactivateLaser()
        return
    }

    const pid = playerQuery()[0]

    if (pid === undefined || !input.fire) {
        deactivateLaser()
        return
    }

    // --------------------------------------------------------
    // EMISSION / DIRECTION
    // --------------------------------------------------------

    const rotation = Rotation[pid]

    const cfg = PLAYER_CONFIG.emission.beam

    const point = getEmissionPoint(
        Position.x[pid],
        Position.y[pid],
        rotation,
        cfg
    )

    const centerX = point.x
    const centerY = point.y

    const baseDirX = Math.sin(-rotation)
    const baseDirY = Math.cos(-rotation)

    const bosses = bossQuery()

    const requestedBeams = Math.max(
        1,
        Math.floor(weapon.beamCount ?? 1)
    )

    const spread = weapon.beamSpread ?? 0

    // Twin muzzles affect rendering only.
    // Damage is calculated once per fan beam.
    const gap = cfg.gunGap ?? 0

    const twin = gap !== 0

    const streamsPerBeam = twin ? 2 : 1

    const beamCount = Math.min(
        requestedBeams,
        Math.floor(MAX_BEAMS / streamsPerBeam)
    )

    const perpendicularX = Math.cos(-rotation)
    const perpendicularY = -Math.sin(-rotation)

    const originAX =
        centerX + perpendicularX * gap

    const originAY =
        centerY + perpendicularY * gap

    const originBX =
        centerX - perpendicularX * gap

    const originBY =
        centerY - perpendicularY * gap

    laserState.active = true

    laserState.sparkTimer -= dt

    const emitSparks =
        laserState.sparkTimer <= 0

    let outIndex = 0

    let primaryHitId = -1
    let primaryHitX = centerX
    let primaryHitY = centerY

    // --------------------------------------------------------
    // BEAM LOOP
    // --------------------------------------------------------

    for (let i = 0; i < beamCount; i++) {
        const angleOffset = beamCount > 1
            ? -spread * 0.5 +
              (spread / (beamCount - 1)) * i
            : 0

        const cos = Math.cos(angleOffset)
        const sin = Math.sin(angleOffset)

        const dirX =
            baseDirX * cos - baseDirY * sin

        const dirY =
            baseDirX * sin + baseDirY * cos

        // ----------------------------------------------------
        // SINGLE TARGET QUERY
        // ----------------------------------------------------

        const target = findBeamTarget(
            centerX,
            centerY,
            dirX,
            dirY,
            weapon.range,
            bosses
        )

        // ----------------------------------------------------
        // DAMAGE RAMP-UP
        // ----------------------------------------------------

        let dps = weapon.directDamage ?? 0

        if (
            weapon.rampTime > 0 &&
            beamCount === 1
        ) {
            if (
                target.id !== -1 &&
                target.id === laserState.lockTargetId
            ) {
                laserState.lockTime = Math.min(
                    laserState.lockTime + dt,
                    weapon.rampTime
                )
            } else {
                laserState.lockTargetId = target.id
                laserState.lockTime = 0
            }

            const ramp = Math.min(
                1,
                laserState.lockTime /
                    weapon.rampTime
            )

            const maxDamage =
                weapon.maxDamage ?? dps

            dps += (maxDamage - dps) * ramp
        } else {
            laserState.lockTargetId = -1
            laserState.lockTime = 0
        }

        // ----------------------------------------------------
        // APPLY DAMAGE
        // ----------------------------------------------------

        const result = applyBeamDamage(
            target,
            dirX,
            dirY,
            dps,
            dt
        )

        if (i === 0) {
            primaryHitId = result.id
            primaryHitX = result.x
            primaryHitY = result.y
        }

        // ----------------------------------------------------
        // VISUAL STREAMS
        // ----------------------------------------------------

        for (
            let stream = 0;
            stream < streamsPerBeam;
            stream++
        ) {
            const originX = twin
                ? stream === 0
                    ? originAX
                    : originBX
                : centerX

            const originY = twin
                ? stream === 0
                    ? originAY
                    : originBY
                : centerY

            laserState.originX[outIndex] = originX
            laserState.originY[outIndex] = originY

            laserState.dirX[outIndex] = dirX
            laserState.dirY[outIndex] = dirY

            laserState.hitT[outIndex] = result.t

            laserState.hitX[outIndex] =
                originX + dirX * result.t

            laserState.hitY[outIndex] =
                originY + dirY * result.t

            laserState.hitActive[outIndex] =
                result.id !== -1

            outIndex++
        }

        // ----------------------------------------------------
        // CHAIN LIGHTNING
        // ----------------------------------------------------

        if (
            weapon.chainCount > 0 &&
            result.type === "asteroid" &&
            result.alive
        ) {
            applyChainLightning(
                result.id,
                result.x,
                result.y,
                dirX,
                dirY,
                weapon,
                dt,
                emitSparks
            )
        }
    }

    // --------------------------------------------------------
    // UPDATE VISUAL STATE
    // --------------------------------------------------------

    laserState.beamCount = outIndex

    laserState.hitLegacy =
        primaryHitId !== -1

    laserState.hitXLegacy = primaryHitX
    laserState.hitYLegacy = primaryHitY

    laserState.length = outIndex > 0
        ? laserState.hitT[0]
        : weapon.range

    // --------------------------------------------------------
    // IMPACT SPARKS
    // --------------------------------------------------------

    if (emitSparks) {
        for (
            let i = 0;
            i < laserState.beamCount;
            i++
        ) {
            if (!laserState.hitActive[i]) {
                continue
            }

            emitEffect(EFFECT.SPARK_BURST, {
                x: laserState.hitX[i],
                y: laserState.hitY[i],
                count: 6,
                speed: 4,
                direction: Math.atan2(
                    laserState.dirY[i],
                    laserState.dirX[i]
                ),
                spread: Math.PI * 0.5,
            })
        }

        laserState.sparkTimer =
            weapon.tickSparkInterval ?? 0.1
    }
}
