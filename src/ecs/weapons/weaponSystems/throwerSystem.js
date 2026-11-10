// src/ecs/weapons/weaponSystems/throwerSystem.js

import { world } from "../../constants/world.js"
import { getEmissionPoint, PLAYER_CONFIG } from "../../constants/emission.js"
import { playerQuery, bossQuery } from "../../constants/queries.js"
import {
    Position,
    Rotation,
    Health,
    Asteroid,
    BossType,
} from "../../constants/components.js"
import { BOSSES } from "../../constants/bosses.js"
import { applyStatusEffects } from "../../systems/statusEffectSystem.js"
import { input } from "../../systems/input.js"
import { startState } from "../../../state/startState.js"
import { getWeapon } from "../config/weapons.js"
import { throwerState as s } from "../weaponState/throwerState.js"
import { killAsteroid, killBoss } from "../../systems/entityDeath.js"
import { emitEffect } from "../../../fx/effects.js"
import { EFFECT } from "../../../fx/FXTypes.js"
import {
    forEachAsteroidInCone,
} from "../../constants/spatialGrid.js"

// Reusable target storage.
const targetIds = []
const targetVersions = []

function inCone(x, y, dx, dy, angle, range, id, radius) {
    const tx = Position.x[id] - x
    const ty = Position.y[id] - y
    const distance = Math.hypot(tx, ty)

    if (distance > range + radius) return false
    if (distance <= radius) return true

    const extraAngle = Math.asin(
        Math.min(1, radius / distance)
    )

    const limit = Math.cos(
        Math.min(Math.PI, angle * 0.5 + extraAngle)
    )

    return (tx * dx + ty * dy) / distance >= limit
}

export function throwerSystem() {
    const dt = world.time.delta
    const weapon = getWeapon(startState.currentWeapon)
    const pid = playerQuery()[0]

    s.hitIds.length = 0

    if (
        !weapon ||
        weapon.category !== "thrower" ||
        pid === undefined ||
        !input.fire ||
        startState.encounterPhase !== "active"
    ) {
        s.active = false
        s.sparkTimer = 0
        return
    }

    const cfg = PLAYER_CONFIG.emission.thrower
    const rot = Rotation[pid]

    const point = getEmissionPoint(
        Position.x[pid],
        Position.y[pid],
        rot,
        cfg
    )

    s.active = true
    s.originX = point.x
    s.originY = point.y

    s.dirX = Math.sin(-rot)
    s.dirY = Math.cos(-rot)

    s.coneAngle = weapon.coneAngle ?? 0.5
    s.range = s.length = weapon.range

    const gap = cfg.gunGap ?? 0
    const px = Math.cos(-rot) * gap
    const py = -Math.sin(-rot) * gap

    s.originAX = point.x + px
    s.originAY = point.y + py
    s.originBX = point.x - px
    s.originBY = point.y - py

    s.sparkTimer -= dt

    const sparks = s.sparkTimer <= 0
    const damage = (weapon.directDamage ?? 0) * dt
    const sparkDirection = Math.atan2(s.dirY, s.dirX)

    function hit(id, radius, kill) {
        if (Health.current[id] <= 0) return

        if (!inCone(
            point.x,
            point.y,
            s.dirX,
            s.dirY,
            s.coneAngle,
            s.range,
            id,
            radius
        )) {
            return
        }

        const x = Position.x[id]
        const y = Position.y[id]

        Health.current[id] -= damage

        if (sparks) {
            emitEffect(EFFECT.SPARK_BURST, {
                x,
                y,
                direction: sparkDirection,
                spread: Math.PI * 0.7,
                count: 4,
                speed: 3,
            })
        }

        if (Health.current[id] <= 0) {
            kill(id, x, y)
        } else {
            applyStatusEffects(id, weapon)
            s.hitIds.push(id)
        }
    }

    // --------------------------------------------------------
    // COLLECT ASTEROIDS
    // --------------------------------------------------------

    targetIds.length = 0
    targetVersions.length = 0

    forEachAsteroidInCone(
        point.x,
        point.y,
        s.dirX,
        s.dirY,
        s.coneAngle,
        s.range,
        (id) => {
            targetIds.push(id)
            targetVersions.push(Asteroid.spawnVersion[id])
        }
    )

    // --------------------------------------------------------
    // APPLY DAMAGE AFTER QUERY
    // --------------------------------------------------------

    // Use a local snapshot so nested effects cannot overwrite
    // the shared collection while this loop is processing.
    const ids = targetIds.slice()
    const versions = targetVersions.slice()

    for (let i = 0; i < ids.length; i++) {
        if (startState.encounterPhase !== "active") break

        const id = ids[i]

        if (
            Asteroid.active[id] !== 1 ||
            Asteroid.spawnVersion[id] !== versions[i] ||
            Health.current[id] <= 0
        ) {
            continue
        }

        hit(id, Asteroid.radius[id], killAsteroid)
    }

    // --------------------------------------------------------
    // BOSSES
    // --------------------------------------------------------

    if (startState.encounterPhase === "active") {
        const bosses = [...bossQuery()]

        for (const id of bosses) {
            if (startState.encounterPhase !== "active") break

            hit(
                id,
                BOSSES[BossType.typeIndex[id]]?.hitRadius ?? 2,
                killBoss
            )
        }
    }

    if (sparks) {
        s.sparkTimer = weapon.tickSparkInterval ?? 0.1
    }
}
