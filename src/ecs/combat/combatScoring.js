// src/ecs/combat/combatScoring.js

import {
    startState,
    resetComboState,
} from "../../state/startState.js"

export const COMBAT_SCORE = Object.freeze({
    ASTEROID: 100,
    BOSS: 1000,

    COMBO_DURATION: 4,
    KILLS_PER_TIER: 5,
    MULTIPLIER_STEP: 0.5,
    MAX_MULTIPLIER: 5,
    BOSS_COMBO_KILLS: 5,
})

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value))
}

export function calculateComboMultiplier(kills) {
    const tiers = Math.floor(
        Math.max(0, kills) / COMBAT_SCORE.KILLS_PER_TIER
    )

    return clamp(
        1 + tiers * COMBAT_SCORE.MULTIPLIER_STEP,
        1,
        COMBAT_SCORE.MAX_MULTIPLIER
    )
}

export function awardCombatScore({
    basePoints,
    comboKills = 1,
} = {}) {
    const points = Number.isFinite(basePoints)
        ? Math.max(0, Math.floor(basePoints))
        : 0

    const kills = Number.isFinite(comboKills)
        ? Math.max(0, Math.floor(comboKills))
        : 0

    if (points === 0) return 0

    startState.comboKills += kills

    startState.comboMultiplier =
        calculateComboMultiplier(startState.comboKills)

    startState.comboTimer = COMBAT_SCORE.COMBO_DURATION

    startState.comboBest = Math.max(
        startState.comboBest,
        startState.comboKills
    )

    const awarded = Math.round(
        points * startState.comboMultiplier
    )

    startState.score += awarded
    startState.lastScoreAward = awarded

    return awarded
}

export function awardAsteroidKill(dangerBonus = 0) {
    const bonus = Number.isFinite(dangerBonus)
        ? Math.max(0, Math.floor(dangerBonus))
        : 0

    return awardCombatScore({
        basePoints: COMBAT_SCORE.ASTEROID + bonus,
        comboKills: 1,
    })
}

export function awardBossKill() {
    return awardCombatScore({
        basePoints: COMBAT_SCORE.BOSS,
        comboKills: COMBAT_SCORE.BOSS_COMBO_KILLS,
    })
}

export function updateCombatScoring(dt) {
    if (
        !Number.isFinite(dt) ||
        dt <= 0 ||
        startState.comboTimer <= 0
    ) {
        return
    }

    startState.comboTimer = Math.max(
        0,
        startState.comboTimer - dt
    )

    if (startState.comboTimer === 0) {
        resetComboState()
    }
}

export function breakCombatCombo() {
    resetComboState()
}
