// src/ecs/systems/weaponEffects.js

import { Position, Health } from "../constants/components.js"
import { spawnHazard, spawnBullet } from "../spawn.js"
import { killAsteroid, killBoss } from "./entityDeath.js"
import { getWeapon } from "../constants/weapons.js"

import { emitEffect } from "../../fx/effects.js"
import { EFFECT } from "../../fx/FXTypes.js"

// -------------------------
// Grenade launcher / any AOE explosive weapon
// -------------------------

export function explodeAt(x, y, weapon, asteroids, bosses) {

    const radius = weapon.explosionRadius ?? 1.5
    const radiusSq = radius * radius

    for (let j = 0; j < asteroids.length; j++) {

        const aid = asteroids[j]
        const dx = x - Position.x[aid]
        const dy = y - Position.y[aid]

        if (dx * dx + dy * dy <= radiusSq) {

            Health.current[aid] -= weapon.damage

            if (Health.current[aid] <= 0) {
                killAsteroid(aid, Position.x[aid], Position.y[aid])
            }
        }
    }

    for (let j = 0; j < bosses.length; j++) {

        const bossId = bosses[j]
        const dx = x - Position.x[bossId]
        const dy = y - Position.y[bossId]
        const bossRadius = radius + 1.0

        if (dx * dx + dy * dy <= bossRadius * bossRadius) {

            Health.current[bossId] -= weapon.damage

            if (Health.current[bossId] <= 0) {
                killBoss(bossId, Position.x[bossId], Position.y[bossId])
            }
        }
    }

    emitEffect(EFFECT.SPARK_BURST, {
        type: EFFECT.SPARK_BURST,
        count: 40,
        speed: 14,
    })

}

// -------------------------
// Arc gun — chains between nearby asteroids, excluding whatever it just hit
// -------------------------

export function chainLightning(startX, startY, weapon, asteroids, excludeId) {

    let hits = 0
    let cx = startX, cy = startY
    const hitIds = new Set([excludeId])
    const points = [{ x: startX, y: startY }]

    while (hits < weapon.chainCount) {

        let nearestId = -1
        let nearestDistSq = weapon.chainRange * weapon.chainRange

        for (let j = 0; j < asteroids.length; j++) {
            const aid = asteroids[j]
            if (hitIds.has(aid)) continue

            const dx = cx - Position.x[aid]
            const dy = cy - Position.y[aid]
            const distSq = dx * dx + dy * dy

            if (distSq <= nearestDistSq) {
                nearestDistSq = distSq
                nearestId = aid
            }
        }

        if (nearestId === -1) break

        Health.current[nearestId] -= weapon.damage

        emitEffect(EFFECT.SPARK_BURST, {
            type: EFFECT.SPARK_BURST,
            x: Position.x[nearestId],
            y: Position.y[nearestId],
            count: 12,
            speed: 6,
        })

        if (Health.current[nearestId] <= 0) {
            killAsteroid(nearestId, Position.x[nearestId], Position.y[nearestId])
        }

        hitIds.add(nearestId)
        cx = Position.x[nearestId]
        cy = Position.y[nearestId]
        points.push({ x: cx, y: cy })
        hits++
    }

    if (points.length > 1) {
        pushArc(points)
    }
}