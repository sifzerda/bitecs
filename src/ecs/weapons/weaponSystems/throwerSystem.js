// src/ecs/weapons/weaponSystems/throwerSystem.js

import { world } from "../../constants/world.js"
import { getEmissionPoint, PLAYER_CONFIG } from "../../constants/emission.js"
import { playerQuery, bossQuery } from "../../constants/queries.js"
import { Position, Rotation, Health, Asteroid, BossType } from "../../constants/components.js"
import { BOSSES } from "../../constants/bosses.js"
import { applyStatusEffects } from "../../systems/statusEffectSystem.js"
import { input } from "../../systems/input.js"
import { startState } from "../../../state/startState.js"
import { getWeapon } from "../config/weapons.js"
import { throwerState as s } from "../weaponState/throwerState.js"
import { killAsteroid, killBoss } from "../../systems/entityDeath.js"
import { activeAsteroids } from "../../pools/asteroidPool.js"
import { emitEffect } from "../../../fx/effects.js"
import { EFFECT } from "../../../fx/FXTypes.js"

// ============================================================
// Cone collision
// ============================================================

function inCone(x, y, dx, dy, angle, range, id, r) {

    const tx = Position.x[id] - x
    const ty = Position.y[id] - y
    const d = Math.hypot(tx, ty)

    if (d > range + r)
        return false

    if (d <= r)
        return true

    return (tx * dx + ty * dy) / d >= Math.cos(Math.min(Math.PI, angle / 2 + Math.asin(Math.min(1, r / d))))
}

export function throwerSystem() {
    const dt = world.time.delta, weapon = getWeapon(startState.currentWeapon), pid = playerQuery()[0]
    s.hitIds.length = 0
    if (!weapon || weapon.category !== "thrower" || pid === undefined || !input.fire || startState.encounterPhase !== "active") {
        s.active = false; s.sparkTimer = 0; return
    }

    const cfg = PLAYER_CONFIG.emission.thrower, rot = Rotation[pid]
    const point = getEmissionPoint(Position.x[pid], Position.y[pid], rot, cfg)

    s.active = true; s.originX = point.x; s.originY = point.y; s.dirX = Math.sin(-rot);
    s.dirY = Math.cos(-rot)
    s.coneAngle = weapon.coneAngle ?? 0.5;
    s.range = s.length = weapon.range

    const gap = cfg.gunGap ?? 0
    const px = Math.cos(-rot) * gap
    const py = -Math.sin(-rot) * gap

    s.originAX = point.x + px;
    s.originAY = point.y + py;
    s.originBX = point.x - px;
    s.originBY = point.y - py
    s.sparkTimer -= dt

    const sparks = s.sparkTimer <= 0

    function hit(id, r, kill) {
        if (Health.current[id] <= 0 || !inCone(point.x, point.y, s.dirX, s.dirY, s.coneAngle, s.range, id, r))
            return
        const x = Position.x[id], y = Position.y[id]
        Health.current[id] -= (weapon.directDamage ?? 0) * dt

        if (sparks) emitEffect(EFFECT.SPARK_BURST, {
            x,
            y,
            count: 4,
            speed: 3
        })

        if (Health.current[id] <= 0) kill(id, x, y)

        else {
            applyStatusEffects(id, weapon);
            s.hitIds.push(id)
        }
    }
    // Reverse iteration is safe for the pool's swap removal.
    for (let i = activeAsteroids.length - 1;
        i >= 0; i--) {
        const id = activeAsteroids[i];
        hit(id, Asteroid.radius[id],
            killAsteroid)
    }

    for (const id of [...bossQuery()]) hit(id, BOSSES[BossType.typeIndex[id]]?.hitRadius ?? 2, killBoss)
    if (sparks)
        s.sparkTimer = weapon.tickSparkInterval ?? 0.1
}
