// src/ecs/weapons/weaponSystems/weaponEffects.js

import { entityExists } from "bitecs"
import { world } from "../../constants/world.js"
import {
    Position,
    Health,
    Asteroid,
    BossType,
} from "../../constants/components.js"
import { BOSSES } from "../../constants/bosses.js"
import { killAsteroid, killBoss } from "../../systems/entityDeath.js"
import { pushArc } from "../weaponState/arcState.js"
import { emitEffect } from "../../../fx/effects.js"
import { EFFECT } from "../../../fx/FXTypes.js"

export function explodeAt(x, y, weapon, asteroids, bosses) {
    const radius = weapon.explosionRadius ?? 1.5
    const damage =
        weapon.explosionDamage ?? weapon.directDamage ?? 0

    for (const id of [...asteroids]) {
        if (!Asteroid.active[id] || Health.current[id] <= 0) {
            continue
        }

        const dx = x - Position.x[id]
        const dy = y - Position.y[id]
        const r = radius + Asteroid.radius[id]

        if (dx * dx + dy * dy > r * r) continue

        Health.current[id] -= damage

        if (Health.current[id] <= 0) {
            killAsteroid(id, Position.x[id], Position.y[id])
        }
    }

    for (const id of [...bosses]) {
        if (!entityExists(world, id) || Health.current[id] <= 0) {
            continue
        }

        const dx = x - Position.x[id]
        const dy = y - Position.y[id]

        const r =
            radius +
            (BOSSES[BossType.typeIndex[id]]?.hitRadius ?? 2)

        if (dx * dx + dy * dy > r * r) continue

        Health.current[id] -= damage

        if (Health.current[id] <= 0) {
            killBoss(id, Position.x[id], Position.y[id])
        }
    }

    emitEffect(EFFECT.SPARK_BURST, {
        x,
        y,
        count: 40,
        speed: 14,
    })
}

export function chainLightning(
    x,
    y,
    weapon,
    asteroids,
    excludeId,
    damageScale = 1
) {
    const used = new Set([excludeId])
    const points = [{ x, y }]

    const damage =
        (weapon.chainDamage ?? weapon.directDamage ?? 0) *
        damageScale

    const rangeSq = (weapon.chainRange ?? 5) ** 2

    let currentX = x
    let currentY = y

    for (let hop = 0; hop < (weapon.chainCount ?? 0); hop++) {
        let target = -1
        let bestDistSq = rangeSq

        for (let i = 0; i < asteroids.length; i++) {
            const id = asteroids[i]

            if (
                used.has(id) ||
                !Asteroid.active[id] ||
                Health.current[id] <= 0
            ) {
                continue
            }

            const dx = Position.x[id] - currentX
            const dy = Position.y[id] - currentY
            const distSq = dx * dx + dy * dy

            if (distSq < bestDistSq) {
                bestDistSq = distSq
                target = id
            }
        }

        if (target === -1) break

        const hitX = Position.x[target]
        const hitY = Position.y[target]

        used.add(target)
        points.push({ x: hitX, y: hitY })

        // Save before killing: pool release may reset Position.
        currentX = hitX
        currentY = hitY

        Health.current[target] -= damage

        if (Health.current[target] <= 0) {
            killAsteroid(target, hitX, hitY)
        }
    }

    if (points.length > 1) {
        pushArc(points)
    }
}
