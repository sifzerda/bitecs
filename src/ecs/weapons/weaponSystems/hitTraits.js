// src/ecs/systems/hitTraits.js

import { Health, StatusEffect } from "../../constants/components"
import { spawnHazard } from "../../spawn"
import { killAsteroid, killBoss } from "../../systems/entityDeath"
import { explodeAt, chainLightning } from "./weaponEffects.js"
import { emitEffect } from "../../../fx/effects"
import { EFFECT } from "../../../fx/FXTypes.js"

// each trait: (present on weapon?) -> apply(ctx). ctx = { x, y, targetId, weapon, kill, asteroids, bosses }
// Traits run in this order for every hit; each is independent and optional.
export const HIT_TRAITS = [
    {
        applies: w => w.explosive,
        apply: ({ x, y, weapon, asteroids, bosses }) => explodeAt(x, y, weapon, asteroids, bosses),
    },
    {
        applies: w => w.leavesHazard,
        apply: ({ x, y, weapon, owner }) => spawnHazard(x, y, weapon.id, owner, -1),
    },
    {
        applies: w => w.attachHazard,
        apply: ({ x, y, weapon, owner, targetId }) => spawnHazard(x, y, weapon.id, owner, targetId),
    },
    {
        applies: w => w.freezeDuration,
        apply: ({ targetId, weapon }) => { StatusEffect.frozen[targetId] = weapon.freezeDuration },
    },
    {
        applies: w => w.chainCount,
        apply: ({ x, y, weapon, asteroids, targetId }) => chainLightning(x, y, weapon, asteroids, targetId),
    },
    {
        applies: w => !w.explosive && !w.leavesHazard,   // "plain impact" spark — skip if another trait already made its own vfx
        apply: ({ x, y }) => emitEffect(EFFECT.SPARK_BURST, { x, y, count: 20, speed: 8 }),
    },
]

// resolves damage + every matching trait for one hit, returns whether target died
export function resolveHit({ x, y, targetId, weapon, owner, kill, asteroids, bosses }) {

    if (weapon.damage > 0 || !weapon.leavesHazard) {
        Health.current[targetId] -= weapon.damage
    }

    const ctx = { x, y, targetId, weapon, owner, asteroids, bosses }
    for (const trait of HIT_TRAITS) {
        if (trait.applies(weapon)) trait.apply(ctx)
    }

    if (Health.current[targetId] <= 0) {
        kill(targetId, x, y)
        return true
    }
    return false
}