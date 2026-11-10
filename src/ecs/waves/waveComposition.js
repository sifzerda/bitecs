// src/ecs/difficulty/waveComposition.js

import { ASTEROID_TYPE as T } from "../asteroids/asteroidTypes.js"
import { ZONE_DIFFICULTY } from "../difficulty/difficultyConfig.js"

export const WAVE_ARCHETYPE = Object.freeze({
    SWARM: "swarm",
    ENDURANCE: "endurance",
    PURSUIT: "pursuit",
    CHAOS: "chaos",
    MIXED: "mixed",
})

const WEIGHTS = {
    [WAVE_ARCHETYPE.SWARM]: {
        [T.NORMAL]: 12,
        [T.HEAVY]: 1,
        [T.FAST]: 7,
        [T.ERRATIC]: 3,
        [T.SPLITTER]: 1,
        [T.HUNTER]: 2,
    },

    [WAVE_ARCHETYPE.ENDURANCE]: {
        [T.NORMAL]: 5,
        [T.HEAVY]: 9,
        [T.FAST]: 1,
        [T.ERRATIC]: 2,
        [T.SPLITTER]: 8,
        [T.HUNTER]: 1,
    },

    [WAVE_ARCHETYPE.PURSUIT]: {
        [T.NORMAL]: 4,
        [T.HEAVY]: 1,
        [T.FAST]: 9,
        [T.ERRATIC]: 3,
        [T.SPLITTER]: 1,
        [T.HUNTER]: 9,
    },

    [WAVE_ARCHETYPE.CHAOS]: {
        [T.NORMAL]: 3,
        [T.HEAVY]: 2,
        [T.FAST]: 5,
        [T.ERRATIC]: 10,
        [T.SPLITTER]: 5,
        [T.HUNTER]: 5,
    },

    [WAVE_ARCHETYPE.MIXED]: {
        [T.NORMAL]: 8,
        [T.HEAVY]: 4,
        [T.FAST]: 5,
        [T.ERRATIC]: 4,
        [T.SPLITTER]: 3,
        [T.HUNTER]: 3,
    },
}

const ZONE_ARCHETYPES = [
    ["swarm", "swarm", "mixed"],
    ["swarm", "endurance", "mixed"],
    ["swarm", "pursuit", "mixed"],
    ["swarm", "chaos", "mixed"],
    ["endurance", "swarm", "mixed"],
    ["pursuit", "chaos", "mixed"],
    ["pursuit", "swarm", "chaos"],
    ["endurance", "chaos", "mixed"],
    ["chaos", "pursuit", "mixed"],
    ["swarm", "endurance", "pursuit"],
    ["pursuit", "chaos", "endurance"],
    ["endurance", "pursuit", "chaos"],
]

const SIGNATURE_TYPES = {
    [WAVE_ARCHETYPE.SWARM]: T.FAST,
    [WAVE_ARCHETYPE.ENDURANCE]: T.HEAVY,
    [WAVE_ARCHETYPE.PURSUIT]: T.HUNTER,
    [WAVE_ARCHETYPE.CHAOS]: T.ERRATIC,
    [WAVE_ARCHETYPE.MIXED]: T.NORMAL,
}

// Relative complexity, not absolute difficulty.
// Zone unlocks still control availability.
const THREAT = {
    [T.NORMAL]: 0,
    [T.HEAVY]: 0.55,
    [T.FAST]: 0.55,
    [T.ERRATIC]: 0.75,
    [T.SPLITTER]: 0.9,
    [T.HUNTER]: 1,
}

const clamp = (value, min, max) =>
    Math.max(min, Math.min(max, value))

function normalizeZone(zoneIndex) {
    return clamp(
        Math.floor(Number.isFinite(zoneIndex) ? zoneIndex : 0),
        0,
        ZONE_DIFFICULTY.length - 1
    )
}

function normalizeWave(waveIndex) {
    return clamp(
        Math.floor(Number.isFinite(waveIndex) ? waveIndex : 0),
        0,
        2
    )
}

export function getUnlockedAsteroidTypes(zoneIndex) {
    const zone = normalizeZone(zoneIndex)
    const unlocked = new Set()

    for (let i = 0; i <= zone; i++) {
        for (const type of ZONE_DIFFICULTY[i].unlocks) {
            unlocked.add(type)
        }
    }

    return [...unlocked]
}

export function getWaveArchetype(zoneIndex, waveIndex = 0) {
    return ZONE_ARCHETYPES[
        normalizeZone(zoneIndex)
    ][normalizeWave(waveIndex)]
}

// adaptation ranges from -1 (easier) to +1 (harder).
export function getAdaptiveWeights(
    archetype,
    unlocked,
    adaptation = 0
) {
    const base = WEIGHTS[archetype] ?? WEIGHTS.mixed

    const intensity = clamp(
        Number.isFinite(adaptation) ? adaptation : 0,
        -1,
        1
    )

    const weights = {}

    for (const type of unlocked) {
        const threat = THREAT[type] ?? 0.5

        // Preserve archetype identity while changing
        // relative odds by a bounded amount.
        const multiplier = Math.exp(
            intensity * (threat - 0.4) * 1.5
        )

        weights[type] = Math.max(
            0,
            (base[type] ?? 0) * multiplier
        )
    }

    return weights
}

function weightedPick(types, weights, random) {
    let total = 0

    for (const type of types) {
        total += weights[type] ?? 0
    }

    if (total <= 0) {
        return types.includes(T.NORMAL)
            ? T.NORMAL
            : types[0]
    }

    let roll = clamp(random(), 0, 0.999999999) * total

    for (const type of types) {
        roll -= weights[type] ?? 0

        if (roll < 0) return type
    }

    return types[types.length - 1]
}

function shuffle(values, random) {
    for (let i = values.length - 1; i > 0; i--) {
        const j = Math.floor(
            clamp(random(), 0, 0.999999999) * (i + 1)
        )

        ;[values[i], values[j]] = [
            values[j],
            values[i],
        ]
    }

    return values
}

export function createWaveComposition(
    count,
    zoneIndex,
    waveIndex = 0,
    random = Math.random,
    options = {}
) {
    const zone = normalizeZone(zoneIndex)
    const wave = normalizeWave(waveIndex)

    const size = Math.max(
        0,
        Math.floor(Number.isFinite(count) ? count : 0)
    )

    if (size === 0) return []

    const archetype = getWaveArchetype(zone, wave)
    const unlocked = getUnlockedAsteroidTypes(zone)

    if (unlocked.length === 0) return []

    const adaptation = options.adaptation ?? 0

    const weights = getAdaptiveWeights(
        archetype,
        unlocked,
        adaptation
    )

    const result = []

    // Guarantee introductions on the first wave.
    if (wave === 0 && options.guaranteeUnlocks !== false) {
        for (const type of ZONE_DIFFICULTY[zone].unlocks) {
            if (
                result.length < size &&
                !result.includes(type)
            ) {
                result.push(type)
            }
        }
    }

    // Preserve archetype identity.
    const signature = SIGNATURE_TYPES[archetype]

    if (
        result.length < size &&
        unlocked.includes(signature) &&
        !result.includes(signature)
    ) {
        result.push(signature)
    }

    while (result.length < size) {
        result.push(
            weightedPick(unlocked, weights, random)
        )
    }

    return shuffle(result, random)
}
