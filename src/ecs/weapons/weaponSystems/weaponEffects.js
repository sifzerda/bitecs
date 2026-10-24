// src/ecs/weapons/weaponSystems/weaponEffects.js

import { entityExists } from "bitecs"
import { world } from "../../constants/world.js"
import { Position, Health, Asteroid, BossType } from "../../constants/components.js"
import { BOSSES } from "../../constants/bosses.js"
import { killAsteroid, killBoss } from "../../systems/entityDeath.js"
import { pushArc } from "../weaponState/arcState.js"
import { emitEffect } from "../../../fx/effects.js"
import { EFFECT } from "../../../fx/FXTypes.js"

// ============================================================
// EXPLOSION
// ============================================================

export function explodeAt(x, y, weapon, asteroids, bosses) {

    const radius = weapon.explosionRadius ?? 1.5
    const damage = weapon.explosionDamage ?? weapon.directDamage ?? 0

    // Snapshot because deaths swap-remove active array entries.
    for (const id of [...asteroids]) {
        if (!Asteroid.active[id] || Health.current[id] <= 0)
            continue

        const r = radius + Asteroid.radius[id]
        const dx = x - Position.x[id]
        const dy = y - Position.y[id]

        if (dx * dx + dy * dy > r * r)
            continue

        Health.current[id] -= damage
        if (Health.current[id] <= 0) killAsteroid(id, Position.x[id], Position.y[id])
    }

    for (const id of [...bosses]) {

        if (!entityExists(world, id) || Health.current[id] <= 0)
            continue

        const r = radius + (BOSSES[BossType.typeIndex[id]]?.hitRadius ?? 2)
        const dx = x - Position.x[id], dy = y - Position.y[id]

        if (dx * dx + dy * dy > r * r)
            continue

        Health.current[id] -= damage
        if (Health.current[id] <= 0) killBoss(id, Position.x[id], Position.y[id])
    }

    emitEffect(EFFECT.SPARK_BURST, { x, y, count: 40, speed: 14 })
}

export function chainLightning(x, y, weapon, asteroids, excludeId, damageScale = 1) {

    const used = new Set([excludeId]), points = [{ x, y }]
    const damage = (weapon.chainDamage ?? weapon.directDamage ?? 0) * damageScale

    for (let hop = 0; hop < (weapon.chainCount ?? 0);
        hop++) {
        let target = -1,
            best = (weapon.chainRange ?? 5) ** 2

        for (const id of asteroids) {
            if (used.has(id) || !Asteroid.active[id] || Health.current[id] <= 0)
                continue

            const dx = Position.x[id] - x
            const dy = Position.y[id] - y
            const d = dx * dx + dy * dy

            if (d < best) { best = d; target = id }
        }
        if (target === -1)
            break

        used.add(target);

        const x = Position.x[target];
        const y = Position.y[target];

        points.push({ x, y })
        Health.current[target] -= damage
        if (Health.current[target] <= 0)
            killAsteroid(target, x, y)
    }

    if (points.length > 1) pushArc(points)
}
