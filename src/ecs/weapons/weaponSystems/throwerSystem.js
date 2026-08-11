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
import { gameState } from "../../../state/gameState.js"

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

    // Widen the effective half-angle so large targets
    // near the edge of the cone still register.
    const angularRadius =
        Math.atan2(targetRadius, dist)

    return angle <=
        coneAngle / 2 + angularRadius
}


// ============================================================
// Thrower system
// ============================================================

export function throwerSystem() {

    const dt = world.time.delta

    const weapon =
        getWeapon(gameState.currentWeapon)


    // --------------------------------------------------------
    // Not a thrower
    // --------------------------------------------------------

    if (weapon.category !== "thrower") {

        throwerState.active = false
        throwerState.hitIds = []

        return
    }


    // --------------------------------------------------------
    // No player / not firing
    // --------------------------------------------------------

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
    // Emission point
    // --------------------------------------------------------

    const point = getEmissionPoint(
        Position.x[pid],
        Position.y[pid],
        Rotation[pid],
        PLAYER_CONFIG.emission.thrower
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
    // Targets
    // --------------------------------------------------------

    const asteroids = activeAsteroids
    const bosses = bossQuery()

    const dps =
        weapon.Damage

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


        // ----------------------------------------------------
        // Direct spray damage
        // ----------------------------------------------------

        Health.current[aid] -=
            dps * dt


        // ----------------------------------------------------
        // Status effects
        //
        // Handles:
        //   - corrosion
        //   - freeze
        //   - future effects
        // ----------------------------------------------------

        applyStatusEffects(
            aid,
            weapon
        )


        // ----------------------------------------------------
        // Death
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // Direct spray damage
        // ----------------------------------------------------

        Health.current[bossId] -=
            dps * dt


        // ----------------------------------------------------
        // Status effects
        // ----------------------------------------------------

        applyStatusEffects(
            bossId,
            weapon
        )


        // ----------------------------------------------------
        // Death
        // ----------------------------------------------------

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