// src/ecs/weapons/weaponSystems/throwerSystem.js

import { world } from "../../constants/world.js"
import {
    getEmissionPoint,
    PLAYER_CONFIG
} from "../../constants/emission.js"

import {
    playerQuery,
    bossQuery
} from "../../constants/queries.js"

import {
    Position,
    Rotation,
    Health
} from "../../constants/components.js"

import { applyStatusEffects } from "../../systems/statusEffectSystem.js"

import { input } from "../../systems/input.js"
import { simState } from "../../../state/simState.js"

import { getWeapon } from "../config/weapons.js"
import { throwerState } from "../weaponState/throwerState.js"

import {
    killAsteroid,
    killBoss
} from "../../systems/entityDeath.js"

import { activeAsteroids } from "../../pools/asteroidPool.js"

import { emitEffect } from "../../../fx/effects.js"
import { EFFECT } from "../../../fx/FXTypes.js"


const ASTEROID_RADIUS = 0.7
const BOSS_RADIUS = 2.0


// ============================================================
// Cone collision
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

    if (dist > range + targetRadius)
        return false

    if (dist < 0.001)
        return true

    const nx = dx / dist
    const ny = dy / dist

    const dot = Math.min(
        1,
        Math.max(
            -1,
            nx * dirX + ny * dirY
        )
    )

    const angle = Math.acos(dot)

    const angularRadius =
        Math.atan2(targetRadius, dist)

    return angle <=
        coneAngle / 2 + angularRadius
}


// ============================================================
// Twin-gun muzzle offset
//
// Purely visual — cone collision/damage below still tests from the
// single centered mount point, so gunGap doesn't double thrower DPS.
// ============================================================

function getTwinOrigins(centerX, centerY, rot, gap) {

    if (!gap) return { ax: centerX, ay: centerY, bx: centerX, by: centerY }

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
// Thrower system
// ============================================================

export function throwerSystem() {

    const dt = world.time.delta

    const weapon = getWeapon(simState.currentWeapon)


    if (weapon.category !== "thrower") {

        throwerState.active = false
        throwerState.hitIds = []

        return
    }


    const players = playerQuery()

    if (
        players.length === 0 ||
        !input.fire
    ) {

        throwerState.active = false
        throwerState.hitIds = []

        return
    }


    const pid = players[0]


    // --------------------------------------------------------
    // Emission point (centered — used for cone testing)
    // --------------------------------------------------------

    const emissionCfg = PLAYER_CONFIG.emission.thrower

    const point = getEmissionPoint(
        Position.x[pid],
        Position.y[pid],
        Rotation[pid],
        emissionCfg
    )


    throwerState.active = true

    throwerState.originX = point.x
    throwerState.originY = point.y

    throwerState.dirX =
        Math.sin(-Rotation[pid])

    throwerState.dirY =
        Math.cos(-Rotation[pid])

    throwerState.coneAngle =
        weapon.coneAngle ?? 0.5

    throwerState.range =
        weapon.range

    throwerState.length =
        weapon.range


    // --------------------------------------------------------
    // Twin visual muzzle points
    //
    // Add `gunGap` to PLAYER_CONFIG.emission.thrower in emission.js to
    // split the stream into two parallel visual jets.
    // --------------------------------------------------------

    const gap = emissionCfg.gunGap ?? 0
    const twin = getTwinOrigins(throwerState.originX, throwerState.originY, Rotation[pid], gap)

    throwerState.originAX = twin.ax
    throwerState.originAY = twin.ay
    throwerState.originBX = twin.bx
    throwerState.originBY = twin.by


    // --------------------------------------------------------
    // Targets
    // --------------------------------------------------------

    const asteroids = activeAsteroids
    const bosses = bossQuery()

    const dps =
        weapon.directDamage

    const hitIds = []


    // ========================================================
    // Asteroids
    // ========================================================

    for (let i = 0; i < asteroids.length; i++) {

        const aid = asteroids[i]


        if (!inCone(
            throwerState.originX,
            throwerState.originY,
            throwerState.dirX,
            throwerState.dirY,
            throwerState.coneAngle,
            weapon.range,
            Position.x[aid],
            Position.y[aid],
            ASTEROID_RADIUS
        )) {
            continue
        }


        hitIds.push(aid)


        Health.current[aid] -=
            dps * dt


        applyStatusEffects(
            aid,
            weapon
        )


        if (Health.current[aid] <= 0) {

            killAsteroid(
                aid,
                Position.x[aid],
                Position.y[aid]
            )
        }
    }


    // ========================================================
    // Bosses
    // ========================================================

    for (let i = 0; i < bosses.length; i++) {

        const bossId = bosses[i]


        if (!inCone(
            throwerState.originX,
            throwerState.originY,
            throwerState.dirX,
            throwerState.dirY,
            throwerState.coneAngle,
            weapon.range,
            Position.x[bossId],
            Position.y[bossId],
            BOSS_RADIUS
        )) {
            continue
        }


        hitIds.push(bossId)


        Health.current[bossId] -=
            dps * dt


        applyStatusEffects(
            bossId,
            weapon
        )


        if (Health.current[bossId] <= 0) {

            killBoss(
                bossId,
                Position.x[bossId],
                Position.y[bossId]
            )
        }
    }


    // ========================================================
    // State
    // ========================================================

    throwerState.hitIds = hitIds


    // ========================================================
    // Sparks
    // ========================================================

    throwerState.sparkTimer -= dt

    if (throwerState.sparkTimer <= 0) {

        for (const eid of hitIds) {

            emitEffect(
                EFFECT.SPARK_BURST,
                {
                    x: Position.x[eid],
                    y: Position.y[eid],
                    count: 4,
                    speed: 3,
                }
            )
        }

        throwerState.sparkTimer =
            weapon.tickSparkInterval ?? 0.1
    }
}