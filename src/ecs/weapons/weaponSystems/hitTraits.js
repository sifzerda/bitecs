import { entityExists } from "bitecs"
import { world } from "../../constants/world.js"
import { Health, Position, Asteroid } from "../../constants/components.js"
import { explodeAt, chainLightning } from "./weaponEffects.js"
import { applyStatusEffects } from "../../systems/statusEffectSystem.js"
import { registerAsteroidImpact } from "../../combat/impactFeedback.js"
import { emitEffect } from "../../../fx/effects.js"
import { EFFECT } from "../../../fx/FXTypes.js"

export function resolveHit({
    x, y, targetId, weapon, kill, asteroids, bosses,
    big = false, directionX = 0, directionY = 0,
}) {
    if (!entityExists(world, targetId) || Health.current[targetId] <= 0) return false
    const targetX = Position.x[targetId]
    const targetY = Position.y[targetId]
    if (weapon.explosive) {
        const previousHealth = Health.current[targetId]
        explodeAt(x, y, weapon, asteroids, bosses)
        return previousHealth > 0 && Health.current[targetId] <= 0
    }
    const damage = Math.max(0, weapon.directDamage ?? 0)
    Health.current[targetId] -= damage
    const killed = Health.current[targetId] <= 0
    if (Asteroid.active[targetId] === 1 && damage > 0) {
        registerAsteroidImpact({
            id: targetId, damage, directionX, directionY, x, y,
        })
    } else {
        emitEffect(EFFECT.SPARK_BURST, {
            x, y, direction: Math.hypot(directionX, directionY) > 1e-6
                ? Math.atan2(directionY, directionX) : null,
            spread: Math.PI * 0.65,
            count: big ? 26 : 20,
            speed: big ? 10 : 8, big,
        })
    }
    if (!killed && (weapon.corrosion || weapon.freezeDuration > 0))
        applyStatusEffects(targetId, weapon)
    if (weapon.chainCount > 0)
        chainLightning(targetX, targetY, weapon, asteroids, targetId)
    if (killed) {
        kill(targetId, targetX, targetY)
        return true
    }
    return false
}
