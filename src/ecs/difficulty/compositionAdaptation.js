// src/ecs/difficulty/compositionAdaptation.js

const clamp = (value, min, max) =>
    Math.max(min, Math.min(max, value))

let adaptation = 0

export function getCompositionAdaptation() {
    return adaptation
}

export function updateCompositionAdaptation({
    killRate = 0,
    averagePressure = 0.5,
    duration = 0,
} = {}) {
    const kills = clamp(killRate / 1.5, 0, 1)
    const pressure = clamp(averagePressure, 0, 1)

    // Reward efficient clearing while avoiding harder
    // compositions when the player is overwhelmed.
    const target = clamp(
        (kills - 0.5) * 1.2 -
        (pressure - 0.5) * 0.8,
        -1,
        1
    )

    // Short encounters have less reliable statistics.
    const confidence = clamp(duration / 10, 0, 1)

    adaptation = clamp(
        adaptation * (1 - 0.35 * confidence) +
        target * (0.35 * confidence),
        -1,
        1
    )

    return adaptation
}

export function resetCompositionAdaptation() {
    adaptation = 0
}
