// src/ecs/systems/hitTraits.js

import { Health } from "../../constants/components.js"
import { explodeAt, chainLightning } from "./weaponEffects.js"
import { applyStatusEffects } from "../../systems/statusEffectSystem.js"
import { emitEffect } from "../../../fx/effects.js"
import { EFFECT } from "../../../fx/FXTypes.js"


// Each trait: (present on weapon?) -> apply(ctx).
// ctx = {
//     x,
//     y,
//     targetId,
//     weapon,
//     owner,
//     kill,
//     asteroids,
//     bosses,
//     big
// }
//
// Traits run in this order for every hit.
// Each is independent and optional.

export const HIT_TRAITS = [

    // --------------------------------------------------------
    // Explosion
    // --------------------------------------------------------

    {
        applies: w => w.explosive,

        apply: ({
            x,
            y,
            weapon,
            asteroids,
            bosses
        }) =>
            explodeAt(
                x,
                y,
                weapon,
                asteroids,
                bosses
            ),
    },


    // --------------------------------------------------------
    // Status effects
    // --------------------------------------------------------

    {
        applies: w =>
            w.corrosion ||
            w.freezeDuration,

        apply: ({
            targetId,
            weapon
        }) =>
            applyStatusEffects(
                targetId,
                weapon
            ),
    },


    // --------------------------------------------------------
    // Chain lightning
    // --------------------------------------------------------

    {
        applies: w => w.chainCount,

        apply: ({
            x,
            y,
            weapon,
            asteroids,
            targetId
        }) =>
            chainLightning(
                x,
                y,
                weapon,
                asteroids,
                targetId
            ),
    },


    // --------------------------------------------------------
    // Impact spark
    // --------------------------------------------------------

    {
        applies: w => !w.explosive,

        apply: ({
            x,
            y,
            big
        }) =>
            emitEffect(
                EFFECT.SPARK_BURST,
                {
                    x,
                    y,
                    count: big ? 26 : 20,
                    speed: big ? 10 : 8,
                    big: !!big,
                }
            ),
    },
]


// ============================================================
// Resolve hit
// ============================================================

export function resolveHit({
    x,
    y,
    targetId,
    weapon,
    owner,
    kill,
    asteroids,
    bosses,
    big = false
}) {

    if (weapon.directDamage > 0) {
        Health.current[targetId] -= weapon.directDamage
    }


    const ctx = {
        x,
        y,
        targetId,
        weapon,
        owner,
        asteroids,
        bosses,
        big
    }


    for (const trait of HIT_TRAITS) {

        if (trait.applies(weapon)) {
            trait.apply(ctx)
        }
    }


    if (Health.current[targetId] <= 0) {

        kill(
            targetId,
            x,
            y
        )

        return true
    }


    return false
}