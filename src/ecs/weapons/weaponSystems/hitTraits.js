// src/ecs/systems/hitTraits.js

import { entityExists } from "bitecs"
import { world } from "../../constants/world.js"
import { Health, Position } from "../../constants/components.js"
import { explodeAt, chainLightning } from "./weaponEffects.js"
import { applyStatusEffects } from "../../systems/statusEffectSystem.js"
import { emitEffect } from "../../../fx/effects.js"
import { EFFECT } from "../../../fx/FXTypes.js"

// Explosion owns damage for explosive projectiles; do not double-hit the primary target.

export function resolveHit({ x, y, targetId, weapon, kill, asteroids, bosses, big = false }) {

    if (!entityExists(world, targetId) || Health.current[targetId] <= 0)
        return false

    const targetX = Position.x[targetId], targetY = Position.y[targetId]

    if (weapon.explosive) {
        explodeAt(x, y, weapon, asteroids, bosses);
        return Health.current[targetId] <= 0
    }

    Health.current[targetId] -= weapon.directDamage ?? 0

    if (Health.current[targetId] > 0 && (weapon.corrosion || weapon.freezeDuration))
        applyStatusEffects(targetId, weapon)
    if (weapon.chainCount)
        chainLightning(targetX, targetY, weapon, asteroids, targetId)

    emitEffect(EFFECT.SPARK_BURST, { x, y, count: big ? 26 : 20, speed: big ? 10 : 8, big })

    if (Health.current[targetId] <= 0) { kill(targetId, targetX, targetY); return true }

    return false
}
