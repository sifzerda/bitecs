// src/ecs/difficulty/adaptivePacing.js

const clamp = (value, min, max) =>
    Math.max(min, Math.min(max, value))

export const ADAPTIVE_PACING = Object.freeze({
    // How quickly recent kill-rate estimates change.
    smoothingTime: 5,

    // Baseline time between groups can be scaled.
    minGroupMultiplier: 0.45,
    maxGroupMultiplier: 1.8,

    // Individual asteroid spawn intervals.
    minSpawnMultiplier: 0.75,
    maxSpawnMultiplier: 1.5,

    // Relative to the configured active-asteroid limit.
    lowDensity: 0.2,
    highDensity: 0.7,

    // Kills per second.
    fastKillRate: 1.5,

    // When the field is empty, shorten the next wait.
    emptyFieldMultiplier: 0.35,

    // Smooth changes in the pressure estimate.
    responseSpeed: 2.5,
})

export function createAdaptivePacingState() {
    return {
        kills: 0,
        elapsed: 0,
        killRate: 0,
        pressure: 0.5,
        active: 0,
    }
}

export function recordAdaptiveKill(state, count = 1) {
    if (!state) return

    state.kills += Math.max(0, count)
}

export function updateAdaptivePacing(
    state,
    {
        dt,
        activeCount,
        maxActive,
    }
) {
    if (!state) return

    const delta = Math.max(
        0,
        Number.isFinite(dt) ? dt : 0
    )

    state.elapsed += delta
    state.active = Math.max(0, activeCount)

    // Update the kill rate once per second.
    if (state.elapsed >= 1) {
        const observedRate = state.kills / state.elapsed

        const blend = 1 - Math.exp(
            -state.elapsed / ADAPTIVE_PACING.smoothingTime
        )

        state.killRate +=
            (observedRate - state.killRate) * blend

        state.kills = 0
        state.elapsed = 0
    }

    const density = clamp(
        state.active / Math.max(1, maxActive),
        0,
        1
    )

    const densityPressure = clamp(
        (density - ADAPTIVE_PACING.lowDensity) /
        (
            ADAPTIVE_PACING.highDensity -
            ADAPTIVE_PACING.lowDensity
        ),
        0,
        1
    )

    const killRelief = clamp(
        state.killRate / ADAPTIVE_PACING.fastKillRate,
        0,
        1
    )

    // Density is the dominant pressure signal.
    const targetPressure = clamp(
        densityPressure * 0.8 +
        (1 - killRelief) * 0.2,
        0,
        1
    )

    const response = 1 - Math.exp(
        -delta * ADAPTIVE_PACING.responseSpeed
    )

    state.pressure +=
        (targetPressure - state.pressure) * response
}

export function getAdaptivePacing(
    state,
    basePacing
) {
    const pressure = clamp(state?.pressure ?? 0.5, 0, 1)

    const groupMultiplier =
        ADAPTIVE_PACING.minGroupMultiplier +
        (
            ADAPTIVE_PACING.maxGroupMultiplier -
            ADAPTIVE_PACING.minGroupMultiplier
        ) * pressure

    const spawnMultiplier =
        ADAPTIVE_PACING.minSpawnMultiplier +
        (
            ADAPTIVE_PACING.maxSpawnMultiplier -
            ADAPTIVE_PACING.minSpawnMultiplier
        ) * pressure

    return {
        ...basePacing,

        groupInterval:
            basePacing.groupInterval *
            (
                state?.active === 0
                    ? Math.min(
                        groupMultiplier,
                        ADAPTIVE_PACING.emptyFieldMultiplier
                    )
                    : groupMultiplier
            ),

        spawnInterval:
            basePacing.spawnInterval * spawnMultiplier,

        pressure,
        killRate: state?.killRate ?? 0,
    }
}
