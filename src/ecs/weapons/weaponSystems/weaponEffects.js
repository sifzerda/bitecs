// src/ecs/weapons/weaponSystems/weaponEffects.js

import { entityExists } from "bitecs"
import { world } from "../../constants/world.js"
import { Position, Health, Asteroid, BossType } from "../../constants/components.js"
import { BOSSES } from "../../constants/bosses.js"
import { forEachAsteroidNear } from "../../constants/spatialGrid.js"
import { killAsteroid, killBoss } from "../../systems/entityDeath.js"
import { emitEffect } from "../../../fx/effects.js"
import { EFFECT } from "../../../fx/FXTypes.js"

// ============================================================
// REUSABLE STORAGE
// ============================================================

// Entity IDs are reused by the asteroid pool.
// These arrays track the spawn version associated with
// each chain-lightning hit.

const usedStamps = new Uint32Array(Position.x.length)
const usedVersions = new Uint32Array(Position.x.length)

let currentStamp = 0

function nextStamp() {
    currentStamp = (currentStamp + 1) >>> 0

    if (currentStamp === 0) {
        usedStamps.fill(0)
        currentStamp = 1
    }

    return currentStamp
}

function markUsed(id, stamp) {
    usedStamps[id] = stamp
    usedVersions[id] = Asteroid.spawnVersion[id]
}

function isUsed(id, stamp) {
    return (
        usedStamps[id] === stamp &&
        usedVersions[id] === Asteroid.spawnVersion[id]
    )
}

// Reusable explosion target storage.
//
// Each explosion call clears these arrays, then collects
// nearby asteroids before applying any damage.

const explosionIds = []
const explosionVersions = []
const explosionX = []
const explosionY = []

// Boss targets are usually few, so we retain a small
// snapshot rather than creating a second broad-phase index.

const bossIds = []
const bossX = []
const bossY = []
const bossRadii = []

// ============================================================
// HELPERS
// ============================================================

function getBossRadius(id) {
    return (
        BOSSES[BossType.typeIndex[id]]?.hitRadius ??
        2
    )
}

function isAliveAsteroid(id, version) {
    return (
        Asteroid.active[id] === 1 &&
        Asteroid.spawnVersion[id] === version &&
        Health.current[id] > 0
    )
}

function isAliveBoss(id) {
    return (
        entityExists(world, id) &&
        Health.current[id] > 0
    )
}

function inRange(
    x,
    y,
    targetX,
    targetY,
    radius
) {
    const dx = targetX - x
    const dy = targetY - y

    return dx * dx + dy * dy <= radius * radius
}

function emitDirectionalSparks(
    x,
    y,
    direction,
    count = 8,
    speed = 6
) {
    emitEffect(EFFECT.SPARK_BURST, {
        x,
        y,
        direction,
        spread: Math.PI * 0.75,
        count,
        speed,
    })
}

// ============================================================
// EXPLOSION TARGET COLLECTION
// ============================================================

// Collect candidates before damage or entity destruction.
//
// The spatial query already includes asteroid collision
// radii, so the exact circle-overlap check is handled by
// forEachAsteroidNear().

function collectExplosionAsteroids(
    x,
    y,
    radius
) {
    explosionIds.length = 0
    explosionVersions.length = 0
    explosionX.length = 0
    explosionY.length = 0

    forEachAsteroidNear(
        x,
        y,
        radius,
        (id) => {
            explosionIds.push(id)

            explosionVersions.push(
                Asteroid.spawnVersion[id]
            )

            explosionX.push(Position.x[id])
            explosionY.push(Position.y[id])
        }
    )
}

function collectExplosionBosses(bosses) {
    bossIds.length = 0
    bossX.length = 0
    bossY.length = 0
    bossRadii.length = 0

    for (const id of bosses) {
        if (!isAliveBoss(id)) continue

        bossIds.push(id)
        bossX.push(Position.x[id])
        bossY.push(Position.y[id])
        bossRadii.push(getBossRadius(id))
    }
}

// ============================================================
// EXPLOSION
// ============================================================

export function explodeAt(
    x,
    y,
    weapon,
    asteroids,
    bosses
) {
    const radius = Math.max(
        0,
        weapon.explosionRadius ?? 1.5
    )

    const damage =
        weapon.explosionDamage ??
        weapon.directDamage ??
        0

    // Both snapshots are completed before any damage.
    // The asteroids parameter is retained for compatibility
    // with existing callers; the spatial grid is now used.

    collectExplosionAsteroids(x, y, radius)
    collectExplosionBosses(bosses)

    // --------------------------------------------------------
    // ASTEROID DAMAGE
    // --------------------------------------------------------

    for (
        let i = 0;
        i < explosionIds.length;
        i++
    ) {
        const id = explosionIds[i]
        const version = explosionVersions[i]

        if (!isAliveAsteroid(id, version)) {
            continue
        }

        const targetX = explosionX[i]
        const targetY = explosionY[i]

        Health.current[id] -= damage

        const direction = Math.atan2(
            targetY - y,
            targetX - x
        )

        emitDirectionalSparks(
            targetX,
            targetY,
            direction,
            10,
            8
        )

        if (Health.current[id] <= 0) {
            killAsteroid(
                id,
                targetX,
                targetY
            )
        }
    }

    // --------------------------------------------------------
    // BOSS DAMAGE
    // --------------------------------------------------------

    for (
        let i = 0;
        i < bossIds.length;
        i++
    ) {
        const id = bossIds[i]

        if (!isAliveBoss(id)) continue

        const targetX = bossX[i]
        const targetY = bossY[i]

        const hitRadius =
            radius + bossRadii[i]

        if (
            !inRange(
                x,
                y,
                targetX,
                targetY,
                hitRadius
            )
        ) {
            continue
        }

        Health.current[id] -= damage

        const direction = Math.atan2(
            targetY - y,
            targetX - x
        )

        emitDirectionalSparks(
            targetX,
            targetY,
            direction,
            14,
            9
        )

        if (Health.current[id] <= 0) {
            killBoss(
                id,
                targetX,
                targetY
            )
        }
    }

    // --------------------------------------------------------
    // EXPLOSION-CENTRE SPARKS
    // --------------------------------------------------------

    emitEffect(EFFECT.SPARK_BURST, {
        x,
        y,
        count: 40,
        speed: 14,
    })
}

// ============================================================
// CHAIN LIGHTNING
// ============================================================

// Each hop performs a local spatial query.
//
// A reusable stamp prevents the same asteroid from being
// selected twice in one chain.
//
// We capture the candidate ID and spawn version before
// applying damage. Destroying an asteroid may recycle IDs
// or spawn fragments, so the version check is essential.

export function chainLightning(
    x,
    y,
    weapon,
    asteroids,
    excludeId,
    damageScale = 1
) {
    const maxHops = Math.max(
        0,
        Math.floor(weapon.chainCount ?? 0)
    )

    if (maxHops === 0) return

    const range = Math.max(
        0,
        weapon.chainRange ?? 5
    )

    if (range <= 0) return

    const damage =
        (
            weapon.chainDamage ??
            weapon.directDamage ??
            0
        ) * damageScale

    const rangeSq = range * range

    const stamp = nextStamp()

    // Preserve the original behaviour: the initial
    // target cannot be selected again.
    if (excludeId !== undefined && excludeId >= 0) {
        markUsed(excludeId, stamp)
    }

    const points = [{ x, y }]

    let currentX = x
    let currentY = y

    for (
        let hop = 0;
        hop < maxHops;
        hop++
    ) {
        let bestId = -1
        let bestVersion = 0
        let bestDistSq = rangeSq

        // ----------------------------------------------------
        // FIND CLOSEST ELIGIBLE TARGET
        // ----------------------------------------------------

        forEachAsteroidNear(
            currentX,
            currentY,
            range,
            (id) => {
                if (
                    isUsed(id, stamp) ||
                    Health.current[id] <= 0
                ) {
                    return
                }

                const dx =
                    Position.x[id] - currentX

                const dy =
                    Position.y[id] - currentY

                const distSq =
                    dx * dx + dy * dy

                if (distSq < bestDistSq) {
                    bestDistSq = distSq
                    bestId = id

                    bestVersion =
                        Asteroid.spawnVersion[id]
                }
            }
        )

        if (bestId === -1) break

        if (
            !isAliveAsteroid(
                bestId,
                bestVersion
            )
        ) {
            continue
        }

        // ----------------------------------------------------
        // CAPTURE TARGET POSITION
        // ----------------------------------------------------

        const targetX = Position.x[bestId]
        const targetY = Position.y[bestId]

        const lightningDirection = Math.atan2(
            targetY - currentY,
            targetX - currentX
        )

        // ----------------------------------------------------
        // REGISTER HIT
        // ----------------------------------------------------

        markUsed(bestId, stamp)

        points.push({
            x: targetX,
            y: targetY,
        })

        // ----------------------------------------------------
        // APPLY DAMAGE
        // ----------------------------------------------------

        Health.current[bestId] -= damage

        emitDirectionalSparks(
            targetX,
            targetY,
            lightningDirection,
            8,
            6
        )

        if (Health.current[bestId] <= 0) {
            killAsteroid(
                bestId,
                targetX,
                targetY
            )
        }

        currentX = targetX
        currentY = targetY
    }
}
